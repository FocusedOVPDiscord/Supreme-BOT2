const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Setup reaction roles with buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Select Your Roles')
            .setDescription('Click the buttons below to get or remove roles.')
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('role_announcements')
                .setLabel('Announcements')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('role_updates')
                .setLabel('Updates')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ content: 'Role panel deployed!', flags: [MessageFlags.Ephemeral] });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};
