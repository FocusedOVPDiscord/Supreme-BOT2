const { query } = require('./db');

/**
 * Calculate comprehensive price statistics and risk analysis
 */
class PriceAnalyzer {
  /**
   * Analyze price data for an item
   * @param {number} itemId - Item ID
   * @returns {Object} Analysis results
   */
  static async analyzeItem(itemId) {
    try {
      // Get all price history
      const priceHistory = await query(
        'SELECT price, created_at FROM gt_price_history WHERE item_id = ? ORDER BY created_at ASC',
        [itemId]
      );

      if (priceHistory.length < 2) {
        return {
          error: 'Insufficient data',
          dataPoints: priceHistory.length,
          minRequired: 2
        };
      }

      const prices = priceHistory.map(p => p.price);
      const timestamps = priceHistory.map(p => p.created_at);

      // Basic statistics
      const currentPrice = prices[prices.length - 1];
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      const median = this.calculateMedian(prices);

      // Volatility calculation
      const volatility = this.calculateVolatility(prices);
      const volatilityLevel = this.getVolatilityLevel(volatility);

      // Growth rate calculation
      const growthRate = this.calculateGrowthRate(prices);

      // Risk assessment
      const riskLevel = this.assessRisk(volatility, growthRate, prices);

      // Price stability
      const stability = this.calculateStability(prices);
      const stabilityLevel = this.getStabilityLevel(stability);

      // Trend detection
      const trend = this.detectTrend(prices);

      // Manipulation detection (simple heuristic)
      const manipulated = this.detectManipulation(prices);

      return {
        dataPoints: prices.length,
        currentPrice,
        avgPrice,
        median,
        minPrice,
        maxPrice,
        priceRange,
        volatility: Math.round(volatility * 100) / 100,
        volatilityLevel,
        growthRate: Math.round(growthRate * 100) / 100,
        riskLevel,
        stability: Math.round(stability * 100) / 100,
        stabilityLevel,
        trend,
        manipulated,
        bestBuyPrice: this.calculateBestBuy(prices, currentPrice),
        bestSellPrice: this.calculateBestSell(prices, currentPrice)
      };
    } catch (error) {
      console.error('Price analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate median price
   */
  static calculateMedian(prices) {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  /**
   * Calculate price volatility (standard deviation)
   */
  static calculateVolatility(prices) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const squareDiffs = prices.map(price => Math.pow(price - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / prices.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get volatility level description
   */
  static getVolatilityLevel(volatility) {
    if (volatility < 5) return 'Very Low';
    if (volatility < 15) return 'Low';
    if (volatility < 30) return 'Moderate';
    if (volatility < 50) return 'High';
    return 'Very High';
  }

  /**
   * Calculate growth rate (percentage change)
   */
  static calculateGrowthRate(prices) {
    if (prices.length < 2) return 0;
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  /**
   * Assess risk level
   */
  static assessRisk(volatility, growthRate, prices) {
    const volatilityScore = volatility > 50 ? 3 : volatility > 30 ? 2 : 1;
    const growthScore = Math.abs(growthRate) > 100 ? 3 : Math.abs(growthRate) > 50 ? 2 : 1;
    const priceVariation = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) * 100;
    const variationScore = priceVariation > 100 ? 3 : priceVariation > 50 ? 2 : 1;

    const totalScore = (volatilityScore + growthScore + variationScore) / 3;

    if (totalScore >= 2.5) return 'High';
    if (totalScore >= 1.5) return 'Medium';
    return 'Low';
  }

  /**
   * Calculate price stability
   */
  static calculateStability(prices) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviations = prices.map(p => Math.abs(p - avg));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / prices.length;
    return 100 - Math.min(100, (avgDeviation / avg) * 100);
  }

  /**
   * Get stability level description
   */
  static getStabilityLevel(stability) {
    if (stability >= 90) return 'Very Stable';
    if (stability >= 70) return 'Stable';
    if (stability >= 50) return 'Moderate';
    if (stability >= 30) return 'Unstable';
    return 'Very Unstable';
  }

  /**
   * Detect price trend
   */
  static detectTrend(prices) {
    if (prices.length < 3) return 'Insufficient data';

    const recentPrices = prices.slice(-5);
    const firstHalf = recentPrices.slice(0, Math.floor(recentPrices.length / 2));
    const secondHalf = recentPrices.slice(Math.floor(recentPrices.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'Rising';
    if (change < -10) return 'Falling';
    return 'Stable';
  }

  /**
   * Detect potential price manipulation
   */
  static detectManipulation(prices) {
    if (prices.length < 5) return 'No';

    // Check for sudden spikes
    for (let i = 1; i < prices.length - 1; i++) {
      const prev = prices[i - 1];
      const curr = prices[i];
      const next = prices[i + 1];

      // If price jumps >100% then drops back, might be manipulation
      if (curr > prev * 2 && next < curr * 0.6) {
        return 'Yes (22.5%)';
      }
    }

    return 'No';
  }

  /**
   * Calculate best buy price (below average)
   */
  static calculateBestBuy(prices, currentPrice) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    return Math.round((min + avg) / 2);
  }

  /**
   * Calculate best sell price (above average)
   */
  static calculateBestSell(prices, currentPrice) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const max = Math.max(...prices);
    return Math.round((max + avg) / 2);
  }

  /**
   * Generate price predictions using linear regression
   */
  static async generatePredictions(itemId) {
    try {
      const priceHistory = await query(
        'SELECT price, created_at FROM gt_price_history WHERE item_id = ? ORDER BY created_at ASC',
        [itemId]
      );

      if (priceHistory.length < 10) {
        return {
          error: 'Insufficient data for predictions',
          minRequired: 10,
          dataPoints: priceHistory.length
        };
      }

      const prices = priceHistory.map(p => p.price);
      const timestamps = priceHistory.map(p => p.created_at);

      // Simple linear regression
      const { slope, intercept } = this.linearRegression(timestamps, prices);

      const now = Date.now();
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      const sixMonths = 6 * oneMonth;
      const oneYear = 12 * oneMonth;

      // Calculate predictions with confidence intervals
      const currentPrice = prices[prices.length - 1];
      const volatility = this.calculateVolatility(prices);
      const margin = volatility * 1.5; // Confidence margin

      const pred1Month = Math.max(1, Math.round(slope * (now + oneMonth) + intercept));
      const pred6Months = Math.max(1, Math.round(slope * (now + sixMonths) + intercept));
      const pred1Year = Math.max(1, Math.round(slope * (now + oneYear) + intercept));

      return {
        currentPrice,
        predicted1Month: {
          min: Math.max(1, Math.round(pred1Month - margin)),
          max: Math.round(pred1Month + margin)
        },
        predicted6Months: {
          min: Math.max(1, Math.round(pred6Months - margin * 2)),
          max: Math.round(pred6Months + margin * 2)
        },
        predicted1Year: {
          min: Math.max(1, Math.round(pred1Year - margin * 3)),
          max: Math.round(pred1Year + margin * 3)
        },
        confidence: Math.max(20, Math.min(95, 100 - volatility)),
        dataPoints: prices.length
      };
    } catch (error) {
      console.error('Prediction generation error:', error);
      throw error;
    }
  }

  /**
   * Simple linear regression
   */
  static linearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }
}

module.exports = PriceAnalyzer;
