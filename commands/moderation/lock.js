const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the current channel (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const { channel, guild } = interaction;

        try {
            // Check if the channel is already locked
            const everyonePermissions = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
            
            if (everyonePermissions && everyonePermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                const alreadyLockedEmbed = new EmbedBuilder()
                    .setTitle('Channel Already Locked')
                    .setDescription('This channel is already locked.')
                    .setColor('#FFA500')
                    .setTimestamp();

                return await interaction.reply({ embeds: [alreadyLockedEmbed], ephemeral: true });
            }

            // Lock the channel for @everyone
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false,
                AddReactions: false
            });

            const lockEmbed = new EmbedBuilder()
                .setTitle('<a:emoji_41:1411678401130922137> Channel Locked')
                .setDescription(`This channel has been locked`)
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.reply({ embeds: [lockEmbed] });

        } catch (error) {
            console.error('[ERROR] Lock Command Failed:', error);
            await interaction.reply({ 
                content: 'Failed to lock the channel. Make sure I have the "Manage Channels" permission!', 
                ephemeral: true 
            });
        }
    },
};