const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-training')
        .setDescription('Configure AI training and behavior')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-prompt')
                .setDescription('Set custom system prompt for AI')
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('The system prompt for AI behavior')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current AI configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset AI to default configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set-prompt') {
            const prompt = interaction.options.getString('prompt');
            
            try {
                // Store custom prompt in database
                await query(
                    'INSERT INTO ai_config (guild_id, config_key, config_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                    [interaction.guildId, 'system_prompt', prompt, prompt]
                );

                await interaction.reply({
                    content: '✅ **AI System Prompt Updated**\n\nThe AI will now use your custom prompt for all responses.',
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Training] Error setting prompt:', error);
                await interaction.reply({
                    content: '❌ Failed to update AI prompt. Please try again.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'view') {
            try {
                const result = await query(
                    'SELECT config_value FROM ai_config WHERE guild_id = ? AND config_key = ?',
                    [interaction.guildId, 'system_prompt']
                );

                const currentPrompt = result[0]?.config_value || 'Using default system prompt';

                await interaction.reply({
                    embeds: [{
                        title: '🤖 AI Configuration',
                        fields: [
                            {
                                name: 'Model',
                                value: 'llama-3.3-70b-versatile (Groq)',
                                inline: true
                            },
                            {
                                name: 'Memory',
                                value: 'Last 10 messages per user',
                                inline: true
                            },
                            {
                                name: 'Active In',
                                value: 'Ticket channels only',
                                inline: true
                            },
                            {
                                name: 'System Prompt',
                                value: `\`\`\`${currentPrompt.substring(0, 1000)}\`\`\``,
                                inline: false
                            }
                        ],
                        color: 0x5865F2
                    }],
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Training] Error viewing config:', error);
                await interaction.reply({
                    content: '❌ Failed to fetch AI configuration.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'reset') {
            try {
                await query(
                    'DELETE FROM ai_config WHERE guild_id = ? AND config_key = ?',
                    [interaction.guildId, 'system_prompt']
                );

                await interaction.reply({
                    content: '✅ **AI Configuration Reset**\n\nThe AI has been reset to default settings.',
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Training] Error resetting config:', error);
                await interaction.reply({
                    content: '❌ Failed to reset AI configuration.',
                    ephemeral: true
                });
            }
        }
    },
};
