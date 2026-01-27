const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const { channel, guild } = interaction;

        try {
            // Check if the channel is already unlocked
            const everyonePermissions = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
            
            // If there are no permission overwrites or SendMessages is not denied, channel is already unlocked
            if (!everyonePermissions || !everyonePermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                const alreadyUnlockedEmbed = new EmbedBuilder()
                    .setTitle('Channel Already Unlocked')
                    .setDescription('This channel is already unlocked.')
                    .setColor('#FFA500')
                    .setTimestamp();

                return await interaction.reply({ embeds: [alreadyUnlockedEmbed], ephemeral: true });
            }

            // Unlock the channel for @everyone
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: null, // Resets to default
                AddReactions: null
            });

            const unlockEmbed = new EmbedBuilder()
                .setTitle('Channel Unlocked')
                .setDescription(`This channel has been unlocked, Everyone can send messages again.`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [unlockEmbed] });

        } catch (error) {
            console.error('[ERROR] Unlock Command Failed:', error);
            await interaction.reply({ 
                content: 'Failed to unlock the channel. Make sure I have the "Manage Channels" permission!', 
                ephemeral: true 
            });
        }
    },
};