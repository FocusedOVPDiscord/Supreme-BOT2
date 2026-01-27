const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and bot information'),

    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Supreme Support', 
                iconURL: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp' 
            } )
            .setTitle('Bot Command Directory')
            .setDescription('Welcome to the **Supreme** command menu. Below you will find all available commands categorized by their functionality.')
            .setColor('#00FF00')
            .addFields(
                { 
                    name: 'Information Commands', 
                    value: '• `/help` - Show this menu\n• `/info ping` - Check bot latency\n• `/info server` - Get server information\n• `/info user` - Get user information',
                    inline: false 
                },
                { 
                    name: 'Moderation Commands', 
                    value: '• `/mod ban` - Ban a member\n• `/mod clear` - Bulk delete messages\n• `/mod kick` - Kick a member\n• `/mod mute` - Timeout a member\n• `/mod warn` - Warn a member',
                    inline: false 
                },
                { 
                    name: 'Management & Utility', 
                    value: '• `/add-member` - Add a member to the ticket\n• `/give-role` - Assign a role to a user\n• `/roles` - Manage server roles\n• `/tickets` - Send the ticket panel',
                    inline: false 
                }
            )
            .setFooter({ text: 'Supreme | Professional Discord Solutions' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
    }
};