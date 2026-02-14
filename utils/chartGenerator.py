#!/usr/bin/env python3
"""
Growtopia Price Chart Generator
Generates professional price prediction charts similar to the reference image
"""

import sys
import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, timedelta
import numpy as np

def generate_chart(data, output_path):
    """Generate a professional price chart with predictions"""
    
    # Parse data
    item_name = data['itemName']
    price_history = data['priceHistory']
    predictions = data.get('predictions', {})
    stats = data.get('stats', {})
    
    # Extract prices and dates
    dates = [datetime.fromtimestamp(entry['timestamp'] / 1000) for entry in price_history]
    prices = [entry['price'] for entry in price_history]
    
    # Create figure with dark theme
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(12, 7), facecolor='#1a1a1a')
    ax.set_facecolor('#0d0d0d')
    
    # Plot historical prices
    ax.plot(dates, prices, color='#00ff88', linewidth=2.5, label='Historical Prices', marker='o', markersize=4)
    
    # Add prediction lines if available
    if predictions and 'predicted1Year' in predictions:
        last_date = dates[-1]
        last_price = prices[-1]
        
        # Future dates
        future_1m = last_date + timedelta(days=30)
        future_6m = last_date + timedelta(days=180)
        future_1y = last_date + timedelta(days=365)
        
        # Prediction values
        pred_1m = (predictions['predicted1Month']['min'] + predictions['predicted1Month']['max']) / 2
        pred_6m = (predictions['predicted6Months']['min'] + predictions['predicted6Months']['max']) / 2
        pred_1y = (predictions['predicted1Year']['min'] + predictions['predicted1Year']['max']) / 2
        
        # Plot prediction line
        pred_dates = [last_date, future_1m, future_6m, future_1y]
        pred_prices = [last_price, pred_1m, pred_6m, pred_1y]
        ax.plot(pred_dates, pred_prices, color='#ffaa00', linewidth=2, linestyle='--', label='Predicted Trend', marker='s', markersize=6)
        
        # Add confidence intervals
        ax.fill_between(
            [last_date, future_1y],
            [last_price, predictions['predicted1Year']['min']],
            [last_price, predictions['predicted1Year']['max']],
            color='#ffaa00',
            alpha=0.15,
            label='Confidence Interval'
        )
    
    # Styling
    ax.set_title(f'{item_name.upper()} - Price Analysis & Predictions', fontsize=18, fontweight='bold', color='#ffffff', pad=20)
    ax.set_xlabel('Date', fontsize=12, color='#aaaaaa')
    ax.set_ylabel('Price (WL)', fontsize=12, color='#aaaaaa')
    
    # Format x-axis
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    plt.xticks(rotation=45, ha='right')
    
    # Grid
    ax.grid(True, alpha=0.2, linestyle='--', linewidth=0.5)
    
    # Legend
    ax.legend(loc='upper left', framealpha=0.8, facecolor='#1a1a1a', edgecolor='#444444')
    
    # Add statistics box
    if stats:
        stats_text = f"""Price Statistics:
Current: {stats.get('currentPrice', 'N/A')} WL
Average: {stats.get('avgPrice', 'N/A')} WL
Range: {stats.get('minPrice', 'N/A')} - {stats.get('maxPrice', 'N/A')} WL
Volatility: {stats.get('volatilityLevel', 'N/A')}
Risk: {stats.get('riskLevel', 'N/A')}
Trend: {stats.get('trend', 'N/A')}"""
        
        props = dict(boxstyle='round', facecolor='#1a1a1a', alpha=0.9, edgecolor='#00ff88', linewidth=2)
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, fontsize=10,
                verticalalignment='top', bbox=props, color='#ffffff', family='monospace')
    
    # Add prediction summary if available
    if predictions and 'predicted1Year' in predictions:
        pred_text = f"""Predictions:
1 Month: {predictions['predicted1Month']['min']}-{predictions['predicted1Month']['max']} WL
6 Months: {predictions['predicted6Months']['min']}-{predictions['predicted6Months']['max']} WL
1 Year: {predictions['predicted1Year']['min']}-{predictions['predicted1Year']['max']} WL
Confidence: {predictions.get('confidence', 'N/A')}%"""
        
        props2 = dict(boxstyle='round', facecolor='#1a1a1a', alpha=0.9, edgecolor='#ffaa00', linewidth=2)
        ax.text(0.98, 0.98, pred_text, transform=ax.transAxes, fontsize=10,
                verticalalignment='top', horizontalalignment='right', bbox=props2, color='#ffffff', family='monospace')
    
    # Tight layout
    plt.tight_layout()
    
    # Save
    plt.savefig(output_path, dpi=150, facecolor='#1a1a1a', edgecolor='none')
    plt.close()
    
    return True

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: chartGenerator.py <json_data> <output_path>')
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        output_path = sys.argv[2]
        
        success = generate_chart(data, output_path)
        
        if success:
            print(f'SUCCESS:{output_path}')
        else:
            print('ERROR:Chart generation failed')
            sys.exit(1)
    except Exception as e:
        print(f'ERROR:{str(e)}')
        sys.exit(1)
