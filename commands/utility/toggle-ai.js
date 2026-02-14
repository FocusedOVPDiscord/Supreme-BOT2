const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/db');

const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-ai')
    .setDescription('Enable or disable the Groq AI system in tickets (Staff only)')
    .addBooleanOption(option =>
      option
        .setName('enabled')
        .setDescription('Enable (true) or disable (false) the AI system')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
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

    const enabled = interaction.options.getBoolean('enabled');

    await interaction.deferReply();

    try {
      // Store AI enabled state in database
      await query(
        'INSERT INTO ai_config (guild_id, config_key, config_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = ?',
        [guildId, 'ai_enabled', enabled ? '1' : '0', Date.now(), Date.now(), enabled ? '1' : '0', Date.now()]
      );

      const embed = new EmbedBuilder()
        .setTitle('🤖 Groq AI System Updated')
        .setDescription(
          enabled 
            ? '✅ **AI system has been ENABLED**\n\n• AI will auto-respond in ticket channels\n• Uses llama-3.3-70b-versatile model\n• Conversation history saved (10 messages per user)\n• Use `/ai-training` to configure behavior\n• Use `/ai-memory` to manage conversations'
            : '❌ **AI system has been DISABLED**\n\n• AI will not respond in tickets\n• Existing conversation memory is preserved\n• Can be re-enabled anytime'
        )
        .setColor(enabled ? '#57F287' : '#ED4245')
        .setFooter({ text: `Changed by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Toggle AI command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while updating the AI system.'
      });
    }
  },
};
