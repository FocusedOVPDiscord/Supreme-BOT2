const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-memory')
        .setDescription('Manage AI conversation memory')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all AI conversation memory'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete specific user conversation')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User whose conversation to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View conversation history')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User whose conversation to view')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to view conversation from')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View AI usage statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export all AI conversations to JSON')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'clear') {
            try {
                const result = await query(
                    'DELETE FROM ai_conversations WHERE 1=1'
                );

                await interaction.reply({
                    content: `✅ **AI Memory Cleared**\n\nDeleted ${result.affectedRows || 0} conversation messages.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Memory] Error clearing memory:', error);
                await interaction.reply({
                    content: '❌ Failed to clear AI memory.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'delete') {
            const user = interaction.options.getUser('user');

            try {
                const result = await query(
                    'DELETE FROM ai_conversations WHERE user_id = ?',
                    [user.id]
                );

                await interaction.reply({
                    content: `✅ **Conversation Deleted**\n\nDeleted ${result.affectedRows || 0} messages from ${user.tag}'s conversation history.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Memory] Error deleting conversation:', error);
                await interaction.reply({
                    content: '❌ Failed to delete conversation.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'view') {
            const user = interaction.options.getUser('user');
            const channel = interaction.options.getChannel('channel');

            try {
                let queryStr = 'SELECT * FROM ai_conversations WHERE user_id = ?';
                let params = [user.id];

                if (channel) {
                    queryStr += ' AND channel_id = ?';
                    params.push(channel.id);
                }

                queryStr += ' ORDER BY created_at DESC LIMIT 50';

                const results = await query(queryStr, params);

                if (results.length === 0) {
                    await interaction.reply({
                        content: `📭 No conversation history found for ${user.tag}.`,
                        ephemeral: true
                    });
                    return;
                }

                let description = '';
                for (const msg of results.slice(0, 10)) {
                    const role = msg.role === 'user' ? '👤 User' : '🤖 AI';
                    const content = msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
                    const timestamp = new Date(msg.created_at).toLocaleString();
                    description += `**${role}** (${timestamp})\n${content}\n\n`;
                }

                await interaction.reply({
                    embeds: [{
                        title: `💬 Conversation History: ${user.tag}`,
                        description: description || 'No messages',
                        footer: { text: `Showing ${Math.min(10, results.length)} of ${results.length} messages` },
                        color: 0x5865F2
                    }],
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Memory] Error viewing conversation:', error);
                await interaction.reply({
                    content: '❌ Failed to fetch conversation history.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'stats') {
            try {
                const totalMessages = await query('SELECT COUNT(*) as count FROM ai_conversations');
                const totalUsers = await query('SELECT COUNT(DISTINCT user_id) as count FROM ai_conversations');
                const totalChannels = await query('SELECT COUNT(DISTINCT channel_id) as count FROM ai_conversations');
                const recentMessages = await query(
                    'SELECT COUNT(*) as count FROM ai_conversations WHERE created_at > ?',
                    [Date.now() - 24 * 60 * 60 * 1000]
                );

                const topUsers = await query(`
                    SELECT user_id, COUNT(*) as count 
                    FROM ai_conversations 
                    GROUP BY user_id 
                    ORDER BY count DESC 
                    LIMIT 5
                `);

                let topUsersText = '';
                for (const row of topUsers) {
                    try {
                        const user = await interaction.client.users.fetch(row.user_id);
                        topUsersText += `${user.tag}: ${row.count} messages\n`;
                    } catch {
                        topUsersText += `Unknown User: ${row.count} messages\n`;
                    }
                }

                await interaction.reply({
                    embeds: [{
                        title: '📊 AI Usage Statistics',
                        fields: [
                            {
                                name: 'Total Messages',
                                value: totalMessages[0].count.toString(),
                                inline: true
                            },
                            {
                                name: 'Unique Users',
                                value: totalUsers[0].count.toString(),
                                inline: true
                            },
                            {
                                name: 'Active Channels',
                                value: totalChannels[0].count.toString(),
                                inline: true
                            },
                            {
                                name: 'Last 24 Hours',
                                value: recentMessages[0].count.toString() + ' messages',
                                inline: false
                            },
                            {
                                name: 'Top Users',
                                value: topUsersText || 'No data',
                                inline: false
                            }
                        ],
                        color: 0x5865F2,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Memory] Error fetching stats:', error);
                await interaction.reply({
                    content: '❌ Failed to fetch AI statistics.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'export') {
            try {
                const results = await query('SELECT * FROM ai_conversations ORDER BY created_at DESC');

                const jsonData = JSON.stringify(results, null, 2);
                const buffer = Buffer.from(jsonData, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, { name: 'ai_conversations_export.json' });

                await interaction.reply({
                    content: `✅ **AI Conversations Exported**\n\nTotal messages: ${results.length}`,
                    files: [attachment],
                    ephemeral: true
                });
            } catch (error) {
                console.error('[AI Memory] Error exporting data:', error);
                await interaction.reply({
                    content: '❌ Failed to export AI conversations.',
                    ephemeral: true
                });
            }
        }
    },
};
