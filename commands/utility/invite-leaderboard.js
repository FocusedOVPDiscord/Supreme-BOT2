const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-leaderboard')
        .setDescription('Show the top inviters in the server'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const dataPath = path.join(__dirname, '..', '..', 'data', 'invites.json');

        if (!fs.existsSync(dataPath)) {
            return interaction.reply({ content: 'No invite data found for this server.', ephemeral: true });
        }

        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const guildData = data[guildId];

        if (!guildData) {
            return interaction.reply({ content: 'No invite data found for this server.', ephemeral: true });
        }

        const allUsers = Object.entries(guildData)
            .filter(([userId]) => userId !== 'joins')
            .map(([userId, stats]) => {
                const total = (stats.regular || 0) + (stats.bonus || 0) - (stats.left || 0);
                return {
                    userId,
                    total: Math.max(0, total),
                    regular: stats.regular || 0,
                    left: stats.left || 0,
                    fake: stats.fake || 0,
                    bonus: stats.bonus || 0
                };
            })
            .filter(user => {
                // Filter out users with all zeros
                return user.total > 0 || user.regular > 0 || user.left > 0 || user.fake > 0 || user.bonus > 0;
            })
            .sort((a, b) => b.total - a.total);

        if (allUsers.length === 0) {
            return interaction.reply({ content: 'The leaderboard is currently empty.', ephemeral: true });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(allUsers.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentUsers = allUsers.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('Invites Leaderboard')
                .setColor('#2F3136')
                .setFooter({ text: `Supreme Bot • Page ${page + 1} of ${totalPages}` }) // Updated Footer Name
                .setTimestamp();

            let description = "";
            currentUsers.forEach((entry, index) => {
                const rank = start + index + 1;
                // All numbers are now BOLDED
                description += `**${rank}.** <@${entry.userId}> • **${entry.total}** invites. (**${entry.regular}** regular, **${entry.left}** left, **${entry.fake}** fake, **${entry.bonus}** bonus)\n`;
            });

            embed.setDescription(description);
            return embed;
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(totalPages <= 1)
        );

        const response = await interaction.reply({
            embeds: [generateEmbed(0)],
            components: totalPages > 1 ? [row] : []
        });

        if (totalPages <= 1) return;

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
            }

            if (i.customId === 'prev') {
                currentPage--;
            } else if (i.customId === 'next') {
                currentPage++;
            }

            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [updatedRow]
            });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};