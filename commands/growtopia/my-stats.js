const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-stats')
    .setDescription('View your Growtopia price tracker statistics'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Get user stats
      const statsResult = await query('SELECT * FROM gt_admin_stats WHERE user_id = ?', [interaction.user.id]);
      
      if (statsResult.length === 0) {
        return interaction.editReply({
          content: '📊 You haven\'t added any prices yet! Use `/price-add` to start contributing.'
        });
      }

      const stats = statsResult[0];

      // Get user's rank
      const rankResult = await query(
        'SELECT COUNT(*) + 1 as rank FROM gt_admin_stats WHERE total_points > ?',
        [stats.total_points]
      );
      const rank = rankResult[0].rank;

      // Get recent submissions
      const recentSubmissions = await query(
        `SELECT gt_items.item_name, gt_price_history.price, gt_price_history.created_at 
         FROM gt_price_history 
         JOIN gt_items ON gt_price_history.item_id = gt_items.id 
         WHERE gt_price_history.submitted_by = ? 
         ORDER BY gt_price_history.created_at DESC 
         LIMIT 5`,
        [interaction.user.id]
      );

      const recentText = recentSubmissions.length > 0
        ? recentSubmissions.map(entry => {
            const date = new Date(entry.created_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `**${entry.item_name}** - ${entry.price} WL (${dateStr})`;
          }).join('\n')
        : 'No recent submissions';

      // Calculate monthly target progress (example: 3500 points)
      const monthlyTarget = 3500;
      const progress = Math.min(100, Math.round((stats.monthly_points / monthlyTarget) * 100));

      const embed = new EmbedBuilder()
        .setTitle(`📊 Your Price Tracker Statistics`)
        .setDescription(`<@${interaction.user.id}>'s contribution stats`)
        .addFields(
          { name: '⭐ Total Points', value: `${stats.total_points}`, inline: true },
          { name: '📊 Prices Added', value: `${stats.total_prices_added}`, inline: true },
          { name: '🏆 Rank', value: `#${rank}`, inline: true },
          { name: '📅 Monthly Points', value: `${stats.monthly_points} / ${monthlyTarget}`, inline: true },
          { name: '📈 Monthly Progress', value: `${progress}% (${progress}/100)`, inline: true },
          { name: '🎯 Position', value: rank === 1 ? '🥇 #1 on leaderboard!' : `#${rank} on leaderboard`, inline: true },
          { name: '📝 Recent Submissions', value: recentText, inline: false }
        )
        .setColor('#3498db')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Keep contributing to earn more points!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('My stats error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching your statistics. Please try again.'
      });
    }
  },
};
