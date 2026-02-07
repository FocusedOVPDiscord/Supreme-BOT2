const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { query } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-leaderboard')
        .setDescription('Show the top inviters in the server'),
    async execute(interaction) {
        const guildId = interaction.guild.id;

        try {
            // Fetch top inviters from TiDB
            const results = await query(
                'SELECT * FROM invites WHERE guild_id = ?',
                [guildId]
            );

            if (!results || results.length === 0) {
                return interaction.reply({ content: 'No invite data found for this server.', ephemeral: true });
            }

            const allUsers = results
                .map(row => {
                    const regular = row.regular || 0;
                    const bonus = row.bonus || 0;
                    const left = row.left_count || 0;
                    const fake = row.fake || 0;
                    const total = Math.max(0, regular + bonus - left);
                    
                    return {
                        userId: row.user_id,
                        total,
                        regular,
                        left,
                        fake,
                        bonus
                    };
                })
                .filter(user => user.total > 0 || user.regular > 0 || user.left > 0 || user.fake > 0 || user.bonus > 0)
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
                    .setFooter({ text: `Supreme Bot • Page ${page + 1} of ${totalPages}` })
                    .setTimestamp();

                let description = "";
                currentUsers.forEach((entry, index) => {
                    const rank = start + index + 1;
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
                    return i.reply({ content: 'You cannot use these buttons.', ephemeral: true }).catch(() => {});
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

                try {
                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [updatedRow]
                    });
                } catch (error) {
                    if (error.code === 10062) {
                        console.warn('⚠️ [LEADERBOARD] Interaction expired during update.');
                    } else {
                        console.error('❌ [LEADERBOARD ERROR]:', error);
                    }
                }
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error fetching leaderboard from TiDB:', error);
            await interaction.reply({ content: 'An error occurred while fetching the leaderboard.', ephemeral: true });
        }
    },
};
