const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');
const PriceAnalyzer = require('../utils/priceAnalyzer');

/**
 * GET /api/growtopia/items
 * Get all tracked items with basic stats
 */
router.get('/items', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const limitNum = Number(limit);
    const search = req.query.search || '';

    let items;
    if (search) {
      items = await query(
        `SELECT gt_items.*, COUNT(gt_price_history.id) as price_count 
         FROM gt_items 
         LEFT JOIN gt_price_history ON gt_items.id = gt_price_history.item_id 
         WHERE gt_items.item_name LIKE ? 
         GROUP BY gt_items.id 
         ORDER BY price_count DESC 
         LIMIT ?`,
        [`%${search}%`, limitNum]
      );
    } else {
      items = await query(
        `SELECT gt_items.*, COUNT(gt_price_history.id) as price_count 
         FROM gt_items 
         LEFT JOIN gt_price_history ON gt_items.id = gt_price_history.item_id 
         GROUP BY gt_items.id 
         ORDER BY price_count DESC 
         LIMIT ?`,
        [limitNum]
      );
    }

    res.json(items);
  } catch (error) {
    console.error('Items fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/growtopia/item/:id
 * Get detailed item information with price history
 */
router.get('/item/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    // Get item info
    const itemResult = await query('SELECT * FROM gt_items WHERE id = ?', [itemId]);
    if (itemResult.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemResult[0];

    // Get price history
    const priceHistory = await query(
      'SELECT price, submitted_by, created_at FROM gt_price_history WHERE item_id = ? ORDER BY created_at DESC LIMIT 100',
      [itemId]
    );

    // Get latest prediction
    const predictionResult = await query(
      'SELECT * FROM gt_predictions WHERE item_id = ? ORDER BY created_at DESC LIMIT 1',
      [itemId]
    );

    res.json({
      item,
      priceHistory,
      prediction: predictionResult.length > 0 ? predictionResult[0] : null
    });
  } catch (error) {
    console.error('Item detail fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/growtopia/item/:id/analysis
 * Get comprehensive price analysis for an item
 */
router.get('/item/:id/analysis', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    // Get item info
    const itemResult = await query('SELECT * FROM gt_items WHERE id = ?', [itemId]);
    if (itemResult.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get analysis
    const stats = await PriceAnalyzer.analyzeItem(itemId);
    const predictions = await PriceAnalyzer.generatePredictions(itemId);

    res.json({
      item: itemResult[0],
      stats,
      predictions
    });
  } catch (error) {
    console.error('Analysis fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/growtopia/leaderboard
 * Get price tracker leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit, 10) || 10;
    const limitNum = Number(limit);

    let leaderboard;
    if (type === 'monthly') {
      leaderboard = await query(
        'SELECT user_id, username, total_prices_added, monthly_points FROM gt_admin_stats ORDER BY monthly_points DESC LIMIT ?',
        [limitNum]
      );
    } else {
      leaderboard = await query(
        'SELECT user_id, username, total_prices_added, total_points FROM gt_admin_stats ORDER BY total_points DESC LIMIT ?',
        [limitNum]
      );
    }

    // Get total stats
    const totalStats = await query('SELECT COUNT(*) as total_admins, SUM(total_prices_added) as total_prices FROM gt_admin_stats');

    res.json({
      leaderboard,
      totalStats: totalStats[0]
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/growtopia/stats
 * Get overall system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const itemCount = await query('SELECT COUNT(*) as count FROM gt_items');
    const priceCount = await query('SELECT COUNT(*) as count FROM gt_price_history');
    const contributorCount = await query('SELECT COUNT(*) as count FROM gt_admin_stats');
    const predictionCount = await query('SELECT COUNT(*) as count FROM gt_predictions');

    // Get most tracked items
    const topItems = await query(
      `SELECT gt_items.item_name, COUNT(gt_price_history.id) as price_count 
       FROM gt_items 
       LEFT JOIN gt_price_history ON gt_items.id = gt_price_history.item_id 
       GROUP BY gt_items.id 
       ORDER BY price_count DESC 
       LIMIT 5`
    );

    res.json({
      totalItems: itemCount[0].count,
      totalPrices: priceCount[0].count,
      totalContributors: contributorCount[0].count,
      totalPredictions: predictionCount[0].count,
      topItems
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
