const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Displays detailed invite statistics for a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to check invites for')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const stats = inviteManager.getUserData(guildId, targetUser.id);
        
        const regular = parseInt(stats.regular) || 0;
        const fake = parseInt(stats.fake) || 0;
        const bonus = parseInt(stats.bonus) || 0;
        const left = parseInt(stats.left) || 0;
        const total = Math.max(0, regular - left + bonus);

        const inviteEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
            .setDescription(`${targetUser}\nYou currently have **${total}** invites. (**${regular}** regular, **${left}** left, **${fake}** fake, **${bonus}** bonus)`)
            .setTimestamp();

        await interaction.reply({ embeds: [inviteEmbed] });
    },
};
