const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price-history')
    .setDescription('View price history for a Growtopia item')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of recent prices to show (default: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
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
    const limit = interaction.options.getInteger('limit') || 10;

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

      // Get price history
      const priceHistory = await query(
        'SELECT price, submitted_by, notes, created_at FROM gt_price_history WHERE item_id = ? ORDER BY created_at DESC LIMIT ?',
        [item.id, limit]
      );

      if (priceHistory.length === 0) {
        return interaction.editReply({
          content: `📊 No price data available for **${item.item_name}** yet. Use \`/price-add\` to add prices!`
        });
      }

      // Calculate statistics
      const prices = priceHistory.map(p => p.price);
      const currentPrice = prices[0];
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      // Format price history for display
      const historyText = priceHistory.slice(0, 5).map((entry, index) => {
        const date = new Date(entry.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `**${entry.price} WL** - ${dateStr}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`📊 Price History: ${item.item_name}`)
        .setDescription(item.description || 'No description available')
        .addFields(
          { name: '💰 Current Price', value: `${currentPrice} WL`, inline: true },
          { name: '📈 Average Price', value: `${avgPrice} WL`, inline: true },
          { name: '📊 Price Range', value: `${minPrice} - ${maxPrice} WL`, inline: true },
          { name: '📉 Recent Prices', value: historyText, inline: false },
          { name: '📝 Data Points', value: `${priceHistory.length} price entries`, inline: true },
          { name: '🎯 Rarity', value: item.rarity || 'Unknown', inline: true }
        )
        .setColor('#3498db')
        .setFooter({ text: `Use /price-chart ${item.item_name} to see a visual chart` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Price history error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching price history. Please try again.'
      });
    }
  },
};
