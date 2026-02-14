const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');
const PriceAnalyzer = require('../../utils/priceAnalyzer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price-predict')
    .setDescription('Get AI-powered price predictions for a Growtopia item')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    try {
      const items = await query(
        'SELECT item_name FROM gt_items WHERE item_name LIKE ? LIMIT 25',
        [`%${focusedValue}%`]
      );
      
      const choices = items.map(item => ({
        name: item.item_name,
        value: item.item_name
      }));
      
      await interaction.respond(choices);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const itemName = interaction.options.getString('item').toLowerCase().trim();

    await interaction.deferReply();

    try {
      // Get item info
      const itemResult = await query('SELECT id, item_name, description, rarity FROM gt_items WHERE item_name = ?', [itemName]);
      
      if (itemResult.length === 0) {
        return interaction.editReply({
          content: `❌ Item **${itemName}** not found in the database!`
        });
      }

      const item = itemResult[0];

      // Get comprehensive analysis
      const stats = await PriceAnalyzer.analyzeItem(item.id);
      
      if (stats.error) {
        return interaction.editReply({
          content: `❌ ${stats.error}. Need at least ${stats.minRequired} price entries to analyze. Currently have ${stats.dataPoints}.`
        });
      }

      // Get predictions
      const predictions = await PriceAnalyzer.generatePredictions(item.id);

      if (predictions.error) {
        return interaction.editReply({
          content: `❌ ${predictions.error}. Need at least ${predictions.minRequired} price entries for predictions. Currently have ${predictions.dataPoints}.`
        });
      }

      // Save predictions to database
      await query(
        `INSERT INTO gt_predictions 
        (item_id, current_price, predicted_1month_min, predicted_1month_max, 
         predicted_6months_min, predicted_6months_max, predicted_1year_min, predicted_1year_max,
         growth_rate, volatility, risk_level, confidence, data_points, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          stats.currentPrice,
          predictions.predicted1Month.min,
          predictions.predicted1Month.max,
          predictions.predicted6Months.min,
          predictions.predicted6Months.max,
          predictions.predicted1Year.min,
          predictions.predicted1Year.max,
          stats.growthRate,
          stats.volatilityLevel,
          stats.riskLevel,
          predictions.confidence,
          stats.dataPoints,
          Date.now()
        ]
      );

      // Determine risk emoji
      const riskEmoji = stats.riskLevel === 'High' ? '🔴' : stats.riskLevel === 'Medium' ? '🟡' : '🟢';
      const manipulatedEmoji = stats.manipulated === 'No' ? '✅' : '⚠️';

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`🔮 ${item.item_name.toUpperCase()} - Price Predictions`)
        .setDescription(item.description || 'AI-powered price analysis and predictions')
        .addFields(
          { name: '💰 Current Price', value: `${stats.currentPrice} WL`, inline: true },
          { name: '📊 Average Price', value: `${stats.avgPrice} WL`, inline: true },
          { name: '📈 Median Price', value: `${stats.median} WL`, inline: true },
          { name: '📉 Price Range', value: `${stats.minPrice} - ${stats.maxPrice} WL`, inline: true },
          { name: '📊 Data Points', value: `${stats.dataPoints} entries`, inline: true },
          { name: '🎯 Rarity', value: item.rarity || 'Unknown', inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: '⚡ Volatility', value: `${stats.volatilityLevel} (${stats.volatility})`, inline: true },
          { name: `${riskEmoji} Risk Level`, value: stats.riskLevel, inline: true },
          { name: '📈 Growth Rate', value: `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%`, inline: true },
          { name: '🔄 Price Stability', value: `${stats.stabilityLevel} (${stats.stability}%)`, inline: true },
          { name: '📊 Trend', value: stats.trend, inline: true },
          { name: `${manipulatedEmoji} Manipulated?`, value: stats.manipulated, inline: true },
          { name: '\u200b', value: '**🔮 AI Predictions**', inline: false },
          { name: '📅 1 Month', value: `${predictions.predicted1Month.min} - ${predictions.predicted1Month.max} WL`, inline: true },
          { name: '📅 6 Months', value: `${predictions.predicted6Months.min} - ${predictions.predicted6Months.max} WL`, inline: true },
          { name: '📅 1 Year', value: `${predictions.predicted1Year.min} - ${predictions.predicted1Year.max} WL`, inline: true },
          { name: '\u200b', value: '**💡 Trading Recommendations**', inline: false },
          { name: '🟢 Best Buy Price', value: `${stats.bestBuyPrice} WL`, inline: true },
          { name: '🔴 Best Sell Price', value: `${stats.bestSellPrice} WL`, inline: true },
          { name: '🎯 Confidence', value: `${predictions.confidence}%`, inline: true }
        )
        .setColor(stats.riskLevel === 'High' ? '#e74c3c' : stats.riskLevel === 'Medium' ? '#f39c12' : '#2ecc71')
        .setFooter({ text: `Use /price-chart ${item.item_name} to see a visual chart` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Price predict error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while generating predictions. Please try again.'
      });
    }
  },
};
