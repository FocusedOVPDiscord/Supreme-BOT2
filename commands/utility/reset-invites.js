const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-invites')
        .setDescription('Resets all invite statistics for the entire server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        inviteManager.resetAll(guildId);
        await interaction.reply('✅ All invite statistics have been reset for this server.');
    },
};
