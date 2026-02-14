const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');

const POINTS_PER_PRICE = 1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quick-price')
    .setDescription('Quickly add an item and its price (auto-creates item if needed)')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Current price in World Locks')
        .setRequired(true)
        .setMinValue(0)),

  async execute(interaction) {
    await interaction.deferReply();

    const itemName = interaction.options.getString('item').toLowerCase().trim();
    const price = interaction.options.getNumber('price');
    const userId = interaction.user.id;

    try {
      // Check if item exists
      const existingItems = await query(
        'SELECT id, item_name, rarity FROM gt_items WHERE LOWER(item_name) = ?',
        [itemName]
      );

      let itemId;
      let itemRarity;
      let isNewItem = false;

      if (existingItems.length === 0) {
        // Auto-create item with "common" rarity and generic description
        const insertResult = await query(
          'INSERT INTO gt_items (item_name, description, rarity, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
          [itemName, `Growtopia item: ${itemName}`, 'common', Date.now(), userId]
        );
        itemId = insertResult.insertId;
        itemRarity = 'common';
        isNewItem = true;
      } else {
        itemId = existingItems[0].id;
        itemRarity = existingItems[0].rarity;
      }

      // Add price to history (matching price-add schema)
      await query(
        'INSERT INTO gt_price_history (item_id, price, submitted_by, source, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [itemId, price, userId, 'quick-add', null, Date.now()]
      );

      // Update admin stats (matching price-add schema)
      const statsResult = await query('SELECT id FROM gt_admin_stats WHERE user_id = ?', [userId]);
      
      if (statsResult.length === 0) {
        // Create new admin stats entry
        await query(
          'INSERT INTO gt_admin_stats (user_id, username, total_prices_added, total_points, monthly_points, last_submission, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, interaction.user.username, 1, POINTS_PER_PRICE, POINTS_PER_PRICE, Date.now(), Date.now(), Date.now()]
        );
      } else {
        // Update existing stats
        await query(
          'UPDATE gt_admin_stats SET total_prices_added = total_prices_added + 1, total_points = total_points + ?, monthly_points = monthly_points + ?, last_submission = ?, username = ?, updated_at = ? WHERE user_id = ?',
          [POINTS_PER_PRICE, POINTS_PER_PRICE, Date.now(), interaction.user.username, Date.now(), userId]
        );
      }

      // Get updated stats
      const updatedStats = await query('SELECT total_prices_added, total_points FROM gt_admin_stats WHERE user_id = ?', [userId]);
      const stats = updatedStats[0];

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(isNewItem ? '#00ff00' : '#0099ff')
        .setTitle('✅ Price Added Successfully')
        .addFields(
          { name: '📦 Item', value: itemName, inline: true },
          { name: '💰 Price', value: `${price} WL`, inline: true },
          { name: '🎨 Rarity', value: itemRarity, inline: true },
          { name: '⭐ Points Earned', value: `+${POINTS_PER_PRICE}`, inline: true },
          { name: '📊 Your Stats', value: `**${stats.total_prices_added}** prices added\n**${stats.total_points}** total points`, inline: false }
        )
        .setFooter({ text: `Submitted by ${interaction.user.tag}` })
        .setTimestamp();

      if (isNewItem) {
        embed.setDescription('🆕 **New item created automatically!**\nYou can update rarity using `/item-add` if needed.');
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in quick-price command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('Failed to add price. Please try again later.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
