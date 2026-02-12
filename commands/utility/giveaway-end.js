const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('./storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-end')
        .setDescription('End an active giveaway immediately')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the giveaway message to end')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const giveawayId = `giveaway_${messageId}`;
        
        const participants = storage.get(interaction.guild.id, giveawayId);
        if (!participants) {
            return interaction.reply({
                content: `❌ No active giveaway found with Message ID: \`${messageId}\``,
                ephemeral: true
            });
        }

        try {
            const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                return interaction.reply({
                    content: `❌ Could not find the giveaway message in this channel.`,
                    ephemeral: true
                });
            }

            if (message.components.length === 0) {
                return interaction.reply({
                    content: `❌ This giveaway has already ended.`,
                    ephemeral: true
                });
            }

            const embed = message.embeds[0];
            const prize = embed.title;
            const winnersCountMatch = embed.description.match(/Winners: \*\*(\d+)\*\*/);
            const winnersCount = winnersCountMatch ? parseInt(winnersCountMatch[1]) : 1;
            const hostMention = embed.description.match(/Hosted by (.*)/)?.[1] || interaction.user.toString();

            const winners = [];
            if (participants.length > 0) {
                const shuffled = [...participants].sort(() => 0.5 - Math.random());
                winners.push(...shuffled.slice(0, Math.min(winnersCount, participants.length)));
            }

            const winnerMentions = winners.length > 0 
                ? winners.map(id => `<@${id}>`).join(', ') 
                : 'No participants';

            const dot = '<:dot:1460754381447237785>';
            const now = new Date();
            const timestamp = Math.floor(now.getTime() / 1000);

            const endEmbed = new EmbedBuilder()
                .setTitle(prize)
                .setColor('#2F3136')
                .setDescription(
                    `${dot} **Ended**: <t:${timestamp}:R> (<t:${timestamp}:F>)\n` +
                    `${dot} **Hosted by**: ${hostMention}\n` +
                    `${dot} **Participants**: **${participants.length}**\n` +
                    `${dot} **Winners**: ${winnerMentions}`
                )
                .setFooter({ text: 'Supreme Bot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await message.edit({ embeds: [endEmbed], components: [] });

            if (winners.length > 0) {
                await interaction.channel.send({
                    content: `🎉 Congratulations ${winnerMentions}! You won the **${prize}**!`
                });
            } else {
                await interaction.channel.send({
                    content: `❌ The giveaway for **${prize}** ended with no participants.`
                });
            }

            // Update metadata to ended
            const meta = storage.get(interaction.guild.id, `giveaway_meta_${messageId}`);
            if (meta) {
                meta.status = 'ended';
                meta.winners = winners;
                meta.participantCount = participants.length;
                await storage.set(interaction.guild.id, `giveaway_meta_${messageId}`, meta);
            }

            return interaction.reply({
                content: `✅ Giveaway \`${messageId}\` has been ended.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error ending giveaway:', error);
            return interaction.reply({
                content: `❌ Failed to end giveaway. Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};
