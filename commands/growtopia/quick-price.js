const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');

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
        'SELECT id, name, rarity FROM gt_items WHERE LOWER(name) = ?',
        [itemName]
      );

      let itemId;
      let itemRarity;
      let isNewItem = false;

      if (existingItems.length === 0) {
        // Auto-create item with "common" rarity and generic description
        const insertResult = await query(
          'INSERT INTO gt_items (name, description, rarity) VALUES (?, ?, ?)',
          [itemName, `Growtopia item: ${itemName}`, 'common']
        );
        itemId = insertResult.insertId;
        itemRarity = 'common';
        isNewItem = true;
      } else {
        itemId = existingItems[0].id;
        itemRarity = existingItems[0].rarity;
      }

      // Add price data
      await query(
        'INSERT INTO gt_price_history (item_id, user_id, price) VALUES (?, ?, ?)',
        [itemId, userId, price]
      );

      // Update admin stats
      await query(
        `INSERT INTO gt_admin_stats (user_id, prices_added, items_added)
         VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE 
           prices_added = prices_added + 1,
           items_added = items_added + ?`,
        [userId, isNewItem ? 1 : 0, isNewItem ? 1 : 0]
      );

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(isNewItem ? '#00ff00' : '#0099ff')
        .setTitle('✅ Price Added Successfully')
        .addFields(
          { name: '📦 Item', value: itemName, inline: true },
          { name: '💰 Price', value: `${price} WL`, inline: true },
          { name: '🎨 Rarity', value: itemRarity, inline: true }
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
