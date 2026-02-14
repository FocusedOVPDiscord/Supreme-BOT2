const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/db');

const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];
const POINTS_PER_PRICE = 1; // Points earned per price submission

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price-add')
    .setDescription('Add a price entry for a Growtopia item (Staff only)')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('price')
        .setDescription('Current price in World Locks (WLs)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option
        .setName('notes')
        .setDescription('Additional notes (optional)')
        .setRequired(false)
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
    const member = interaction.member;

    // Check if user is staff
    const hasStaffRole = member.roles.cache.some(role => STAFF_ROLE_IDS.includes(role.id));
    const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasStaffRole && !hasAdminPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command. Staff only.',
        ephemeral: true
      });
    }

    const itemName = interaction.options.getString('item').toLowerCase().trim();
    const price = interaction.options.getInteger('price');
    const notes = interaction.options.getString('notes') || null;

    await interaction.deferReply();

    try {
      // Check if item exists
      const itemResult = await query('SELECT id FROM gt_items WHERE item_name = ?', [itemName]);
      
      if (itemResult.length === 0) {
        return interaction.editReply({
          content: `❌ Item **${itemName}** not found! Use \`/item-add\` to add it first.`
        });
      }

      const itemId = itemResult[0].id;

      // Add price to history
      await query(
        'INSERT INTO gt_price_history (item_id, price, submitted_by, source, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [itemId, price, interaction.user.id, 'manual', notes, Date.now()]
      );

      // Update admin stats
      const statsResult = await query('SELECT id FROM gt_admin_stats WHERE user_id = ?', [interaction.user.id]);
      
      if (statsResult.length === 0) {
        // Create new admin stats entry
        await query(
          'INSERT INTO gt_admin_stats (user_id, username, total_prices_added, total_points, monthly_points, last_submission, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [interaction.user.id, interaction.user.username, 1, POINTS_PER_PRICE, POINTS_PER_PRICE, Date.now(), Date.now(), Date.now()]
        );
      } else {
        // Update existing stats
        await query(
          'UPDATE gt_admin_stats SET total_prices_added = total_prices_added + 1, total_points = total_points + ?, monthly_points = monthly_points + ?, last_submission = ?, username = ?, updated_at = ? WHERE user_id = ?',
          [POINTS_PER_PRICE, POINTS_PER_PRICE, Date.now(), interaction.user.username, Date.now(), interaction.user.id]
        );
      }

      // Get updated stats
      const updatedStats = await query('SELECT total_prices_added, total_points FROM gt_admin_stats WHERE user_id = ?', [interaction.user.id]);
      const stats = updatedStats[0];

      const embed = new EmbedBuilder()
        .setTitle('✅ Price Added Successfully')
        .setDescription(`Price for **${itemName}** has been recorded!`)
        .addFields(
          { name: '💰 Price', value: `${price} WL`, inline: true },
          { name: '📦 Item', value: itemName, inline: true },
          { name: '⭐ Points Earned', value: `+${POINTS_PER_PRICE}`, inline: true },
          { name: '📊 Your Stats', value: `**${stats.total_prices_added}** prices added\n**${stats.total_points}** total points`, inline: false }
        )
        .setColor('#57F287')
        .setFooter({ text: `Submitted by ${interaction.user.tag}` })
        .setTimestamp();

      if (notes) {
        embed.addFields({ name: '📝 Notes', value: notes });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Price add error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while adding the price. Please try again.'
      });
    }
  },
};
