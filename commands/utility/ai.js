const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with AI or train the AI system')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const userMessage = interaction.options.getString('message');

    // Initialize AI if needed
    await aiService.initialize(guildId);

    if (!aiService.isEnabled(guildId)) {
      return interaction.reply({
        content: '❌ AI system is currently disabled. Use `/toggle-ai` to enable it.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const response = await aiService.chat(guildId, userId, userMessage);

      if (!response) {
        return interaction.editReply({
          content: '❌ AI system is not available. Please try again later.'
        });
      }

      // Split response if too long
      if (response.length > 2000) {
        const chunks = response.match(/.{1,2000}/g);
        await interaction.editReply({ content: chunks[0] });
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp({ content: chunks[i] });
        }
      } else {
        await interaction.editReply({
          content: `🤖 **AI Response:**\n\n${response}`
        });
      }
    } catch (error) {
      console.error('AI command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing your request.'
      });
    }
  },
};
