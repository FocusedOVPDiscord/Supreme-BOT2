const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const aiService = require('../../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-memory')
    .setDescription('View, delete, or export AI training history')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your AI conversation history')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of recent messages to show (default: 10)')
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a specific memory entry')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('Memory ID to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all your AI memory (cannot be undone!)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('export')
        .setDescription('Export your AI memory as JSON file')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View AI system statistics')
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    // Initialize AI if needed
    await aiService.initialize(guildId);

    if (!aiService.isEnabled(guildId)) {
      return interaction.reply({
        content: '❌ AI system is currently disabled. Use `/toggle-ai` to enable it.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'view': {
          const limit = interaction.options.getInteger('limit') || 10;
          const memory = await aiService.getAllMemory(guildId, userId);

          if (memory.length === 0) {
            return interaction.editReply({
              content: '📭 You have no AI conversation history yet. Use `/ai` to start chatting!'
            });
          }

          const recentMemory = memory.slice(0, limit);
          const embed = new EmbedBuilder()
            .setTitle('🧠 AI Memory History')
            .setDescription(`Showing ${recentMemory.length} of ${memory.length} total messages`)
            .setColor('#5865F2')
            .setTimestamp();

          recentMemory.forEach((entry, index) => {
            const roleEmoji = entry.role === 'user' ? '👤' : '🤖';
            const timestamp = new Date(entry.created_at).toLocaleString();
            const content = entry.content.length > 100 
              ? entry.content.substring(0, 100) + '...' 
              : entry.content;
            
            embed.addFields({
              name: `${roleEmoji} ${entry.role.toUpperCase()} (ID: ${entry.id})`,
              value: `${content}\n*${timestamp}*`,
              inline: false
            });
          });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'delete': {
          const memoryId = interaction.options.getInteger('id');
          const success = await aiService.deleteMemory(guildId, userId, memoryId);

          if (success) {
            await interaction.editReply({
              content: `✅ Memory entry #${memoryId} has been deleted.`
            });
          } else {
            await interaction.editReply({
              content: `❌ Could not delete memory entry #${memoryId}. Make sure the ID is correct.`
            });
          }
          break;
        }

        case 'clear': {
          // Confirmation buttons
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`ai_clear_confirm_${userId}`)
                .setLabel('Yes, Clear All')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`ai_clear_cancel_${userId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
            );

          const response = await interaction.editReply({
            content: '⚠️ **Are you sure?**\n\nThis will permanently delete all your AI conversation history. This action cannot be undone!',
            components: [row]
          });

          // Wait for button interaction
          const filter = i => i.user.id === userId;
          const collector = response.createMessageComponentCollector({ filter, time: 30000 });

          collector.on('collect', async i => {
            if (i.customId === `ai_clear_confirm_${userId}`) {
              const success = await aiService.clearMemory(guildId, userId);
              if (success) {
                await i.update({
                  content: '✅ All your AI memory has been cleared.',
                  components: []
                });
              } else {
                await i.update({
                  content: '❌ Failed to clear memory. Please try again.',
                  components: []
                });
              }
            } else {
              await i.update({
                content: '❌ Memory clear cancelled.',
                components: []
              });
            }
            collector.stop();
          });

          collector.on('end', collected => {
            if (collected.size === 0) {
              interaction.editReply({
                content: '⏱️ Confirmation timed out. Memory was not cleared.',
                components: []
              }).catch(() => {});
            }
          });
          break;
        }

        case 'export': {
          const exportData = await aiService.exportMemory(guildId, userId);
          
          if (exportData === '[]') {
            return interaction.editReply({
              content: '📭 You have no AI memory to export.'
            });
          }

          const buffer = Buffer.from(exportData, 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { 
            name: `ai_memory_${userId}_${Date.now()}.json` 
          });

          await interaction.editReply({
            content: '📦 Here is your AI memory export:',
            files: [attachment]
          });
          break;
        }

        case 'stats': {
          const stats = await aiService.getStats(guildId);
          const userMemory = await aiService.getAllMemory(guildId, userId);

          const embed = new EmbedBuilder()
            .setTitle('📊 AI System Statistics')
            .setColor('#5865F2')
            .addFields(
              { name: '💬 Total Messages (Server)', value: stats.total_messages.toString(), inline: true },
              { name: '👥 Unique Users', value: stats.unique_users.toString(), inline: true },
              { name: '🧠 Your Messages', value: userMemory.length.toString(), inline: true },
              { name: '🤖 Status', value: aiService.isEnabled(guildId) ? '✅ Enabled' : '❌ Disabled', inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('AI memory command error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing your request.'
      });
    }
  },
};
