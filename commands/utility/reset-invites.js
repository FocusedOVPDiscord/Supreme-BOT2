const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-invites')
        .setDescription('Resets all invite statistics for the entire server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const success = inviteManager.resetAll(interaction.guild.id);
            if (!success) return await interaction.reply({ content: '? No invite data found to reset.', ephemeral: true });

            const resetEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Invites Reset')
                .setDescription('All invite statistics have been successfully cleared for this server.')
                .setTimestamp();

            await interaction.reply({ embeds: [resetEmbed] });
        } catch (error) {
            await interaction.reply({ content: 'There was an error trying to reset the invites.', ephemeral: true });
        }
    },
};
