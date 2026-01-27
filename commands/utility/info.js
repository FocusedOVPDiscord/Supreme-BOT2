const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Utility information commands')
        .addSubcommand(sub =>
            sub.setName('user')
                .setDescription('Get information about a user')
                .addUserOption(opt => opt.setName('target').setDescription('The user to get info about')))
        .addSubcommand(sub =>
            sub.setName('server')
                .setDescription('Get information about the server'))
        .addSubcommand(sub =>
            sub.setName('avatar')
                .setDescription('Get a user\'s avatar')
                .addUserOption(opt => opt.setName('target').setDescription('The user to get the avatar of')))
        .addSubcommand(sub =>
            sub.setName('ping')
                .setDescription('Check the bot\'s latency')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target') || interaction.user;
        const member = interaction.options.getMember('target') || interaction.member;

        const embed = new EmbedBuilder().setTimestamp().setColor('#5865F2');

        switch (subcommand) {
            case 'user':
                embed.setTitle(`👤 User Info: ${target.tag}`)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: 'ID', value: target.id, inline: true },
                        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                        { name: 'Joined Discord', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: 'Roles', value: member.roles.cache.map(r => r).join(' ') || 'None' }
                    );
                break;
            case 'server':
                const guild = interaction.guild;
                embed.setTitle(`🏰 Server Info: ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                        { name: 'Members', value: `${guild.memberCount}`, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true }
                    );
                break;
            case 'avatar':
                embed.setTitle(`🖼️ Avatar: ${target.tag}`)
                    .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }));
                break;
            case 'ping':
                return interaction.reply({ content: `🏓 **Pong!** Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms.`, flags: [MessageFlags.Ephemeral] });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
