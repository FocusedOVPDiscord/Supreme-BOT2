const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-invites')
        .setDescription('Resets all invite statistics for the entire server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const guildId = interaction.guild.id;
        await inviteManager.resetAll(guildId);
        await interaction.editReply('✅ All invite statistics have been reset for this server.');
    },
};
