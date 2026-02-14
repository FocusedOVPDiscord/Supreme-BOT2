const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price-leaderboard')
    .setDescription('View the Growtopia price tracker leaderboard')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'All Time', value: 'all' },
          { name: 'Monthly', value: 'monthly' }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type') || 'all';

    await interaction.deferReply();

    try {
      let leaderboard;
      let title;
      let pointsField;

      if (type === 'monthly') {
        leaderboard = await query(
          'SELECT user_id, username, total_prices_added, monthly_points FROM gt_admin_stats ORDER BY monthly_points DESC LIMIT 10'
        );
        title = '📊 Monthly Price Tracker Leaderboard';
        pointsField = 'monthly_points';
      } else {
        leaderboard = await query(
          'SELECT user_id, username, total_prices_added, total_points FROM gt_admin_stats ORDER BY total_points DESC LIMIT 10'
        );
        title = '🏆 All-Time Price Tracker Leaderboard';
        pointsField = 'total_points';
      }

      if (leaderboard.length === 0) {
        return interaction.editReply({
          content: '📊 No leaderboard data available yet. Start adding prices with `/price-add`!'
        });
      }

      // Format leaderboard
      const leaderboardText = leaderboard.map((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const points = entry[pointsField];
        return `${medal} <@${entry.user_id}> - **${points}** points (${entry.total_prices_added} prices)`;
      }).join('\n');

      // Get total stats
      const totalStats = await query('SELECT COUNT(*) as total_admins, SUM(total_prices_added) as total_prices FROM gt_admin_stats');
      const stats = totalStats[0];

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(leaderboardText)
        .addFields(
          { name: '👥 Total Contributors', value: `${stats.total_admins}`, inline: true },
          { name: '📊 Total Prices Added', value: `${stats.total_prices}`, inline: true },
          { name: '💡 Tip', value: 'Add prices with `/price-add` to earn points!', inline: false }
        )
        .setColor('#f1c40f')
        .setFooter({ text: 'Keep contributing to climb the leaderboard!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Leaderboard error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching the leaderboard. Please try again.'
      });
    }
  },
};
