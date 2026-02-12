const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const aiService = require('../../utils/aiService');

const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-ai')
    .setDescription('Enable or disable the AI system (Staff only)')
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
      // Initialize AI if needed
      await aiService.initialize(guildId);

      // Toggle AI
      const success = await aiService.toggle(guildId, enabled);

      if (success) {
        const embed = new EmbedBuilder()
          .setTitle('🤖 AI System Updated')
          .setDescription(
            enabled 
              ? '✅ **AI system has been ENABLED**\n\n• Users can now use `/ai` to chat with the AI\n• AI will auto-respond in ticket channels\n• Conversation history is saved to memory'
              : '❌ **AI system has been DISABLED**\n\n• `/ai` command will not work\n• AI will not respond in tickets\n• Existing memory is preserved'
          )
          .setColor(enabled ? '#57F287' : '#ED4245')
          .setFooter({ text: `Changed by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({
          content: '❌ Failed to update AI system. Please try again.'
        });
      }
    } catch (error) {
      console.error('Toggle AI command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while updating the AI system.'
      });
    }
  },
};
