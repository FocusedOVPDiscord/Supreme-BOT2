const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('./storage.js');

/**
 * SUPREME GIVEAWAY LIST COMMAND
 * - Lists all active giveaways in the server
 * - Deeper validation: Checks message existence, buttons, AND embed content
 * - Automatically cleans up ended/deleted giveaways from the list
 * - Restricted to Administrators
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-list')
        .setDescription('List all active giveaways in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guild.id;
        const allData = storage.get(guildId, 'all_giveaways') || [];
        
        const activeGiveaways = [];
        const endedGiveaways = [];

        // Get all text channels to search for messages
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());

        for (const msgId of allData) {
            let foundMessage = null;
            
            // Search for the message in all channels
            for (const [id, channel] of channels) {
                try {
                    const msg = await channel.messages.fetch(msgId).catch(() => null);
                    if (msg) {
                        foundMessage = msg;
                        break;
                    }
                } catch (e) { continue; }
            }

            if (!foundMessage) {
                // Message no longer exists
                endedGiveaways.push(msgId);
                continue;
            }

            // DEEP VALIDATION:
            // 1. Check if it has buttons (Active giveaways always have buttons)
            // 2. Check the embed description for the "Ended" dot emoji or text
            const embed = foundMessage.embeds[0];
            const hasButtons = foundMessage.components.length > 0;
            const isEndedInEmbed = embed?.description?.includes('Ended') || embed?.description?.includes('\u23F3 Ended');

            if (hasButtons && !isEndedInEmbed) {
                activeGiveaways.push({
                    id: msgId,
                    url: foundMessage.url,
                    prize: embed?.title || 'Unknown Prize'
                });
            } else {
                // It has no buttons or the embed says it's ended
                endedGiveaways.push(msgId);
            }
        }

        // SELF-CLEANING: Remove ended giveaways from storage
        if (endedGiveaways.length > 0) {
            const updatedList = allData.filter(id => !endedGiveaways.includes(id));
            storage.set(guildId, 'all_giveaways', updatedList);
        }

        if (activeGiveaways.length === 0) {
            return interaction.editReply({
                content: `\u26A0\uFE0F No active giveaways found in this server. (Cleaned up ${endedGiveaways.length} old entries)`
            });
        }

        const dot = '<:dot:1460754381447237785>';
        const list = activeGiveaways.map(g => `${dot} **${g.prize}**\n  ID: \`${g.id}\` \u00B7 [Jump to Message](${g.url})`).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('\u{1F389} Active Giveaways')
            .setDescription(`Here are the currently running giveaways:\n\n${list}`)
            .setColor('#5865F2')
            .setFooter({ text: 'Supreme Bot \u00B7 Deep Validation Active', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};