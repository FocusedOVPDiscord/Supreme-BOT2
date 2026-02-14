const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { query } = require('../../utils/db');
const PriceAnalyzer = require('../../utils/priceAnalyzer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price-chart')
    .setDescription('Generate a price chart with predictions for a Growtopia item')
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
      const itemResult = await query('SELECT id, item_name FROM gt_items WHERE item_name = ?', [itemName]);
      
      if (itemResult.length === 0) {
        return interaction.editReply({
          content: `❌ Item **${itemName}** not found in the database!`
        });
      }

      const item = itemResult[0];

      // Get price history
      const priceHistory = await query(
        'SELECT price, created_at FROM gt_price_history WHERE item_id = ? ORDER BY created_at ASC',
        [item.id]
      );

      if (priceHistory.length < 5) {
        return interaction.editReply({
          content: `❌ Not enough price data to generate a chart. Need at least 5 data points, have ${priceHistory.length}.`
        });
      }

      // Get statistics and predictions
      const stats = await PriceAnalyzer.analyzeItem(item.id);
      const predictions = await PriceAnalyzer.generatePredictions(item.id);

      // Prepare data for chart
      const chartData = {
        itemName: item.item_name,
        priceHistory: priceHistory.map(p => ({
          price: p.price,
          timestamp: p.created_at
        })),
        stats: stats,
        predictions: predictions.error ? null : predictions
      };

      // Generate chart
      const outputPath = path.join('/tmp', `chart_${item.id}_${Date.now()}.png`);
      const chartScript = path.join(__dirname, '../../utils/chartGenerator.py');
      
      const command = `python3 "${chartScript}" '${JSON.stringify(chartData)}' "${outputPath}"`;

      exec(command, async (error, stdout, stderr) => {
        try {
          if (error) {
            console.error('Chart generation error:', error, stderr);
            return interaction.editReply({
              content: '❌ Failed to generate chart. Please try again later.'
            });
          }

          // Check if file exists
          if (!fs.existsSync(outputPath)) {
            return interaction.editReply({
              content: '❌ Chart file not generated. Please try again.'
            });
          }

          // Create attachment
          const attachment = new AttachmentBuilder(outputPath, { name: `${item.item_name}_chart.png` });

          // Create embed
          const embed = new EmbedBuilder()
            .setTitle(`📊 ${item.item_name.toUpperCase()} - Price Analysis`)
            .setDescription('Professional price chart with predictions and statistics')
            .setImage(`attachment://${item.item_name}_chart.png`)
            .setColor('#00ff88')
            .setFooter({ text: `Data points: ${priceHistory.length} | Generated at ${new Date().toLocaleString()}` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], files: [attachment] });

          // Clean up
          setTimeout(() => {
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
          }, 5000);
        } catch (err) {
          console.error('Chart reply error:', err);
          await interaction.editReply({
            content: '❌ An error occurred while sending the chart.'
          });
        }
      });
    } catch (error) {
      console.error('Price chart error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while generating the chart. Please try again.'
      });
    }
  },
};
