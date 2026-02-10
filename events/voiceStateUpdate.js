const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

const JOIN_TO_CREATE_ID = '1470577500336685178';
const CONTROL_CHANNEL_ID = '1470577900540661925';
const activeVoiceChannels = new Map(); // ownerId -> channelId

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const { member, guild } = newState;

        // User joined the "Join to Create" channel
        if (newState.channelId === JOIN_TO_CREATE_ID) {
            try {
                // Create the private voice channel
                const voiceChannel = await guild.channels.create({
                    name: `🔊 ${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parent,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect], // Lock by default
                        },
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.Connect, 
                                PermissionFlagsBits.Speak, 
                                PermissionFlagsBits.Stream,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers
                            ],
                        },
                    ],
                });

                // Move member to the new channel
                await member.voice.setChannel(voiceChannel);
                activeVoiceChannels.set(member.id, voiceChannel.id);

                // Send control panel in the control channel
                const controlChannel = await guild.channels.fetch(CONTROL_CHANNEL_ID);
                if (controlChannel) {
                    const controlEmbed = new EmbedBuilder()
                        .setTitle('Temp Control')
                        .setDescription(`Control panel for <@${member.id}>'s room.\nUse the buttons below to manage your temporary voice channel.`)
                        .setColor('#2F3136')
                        .setFooter({ text: 'Supreme Voice Control' })
                        .setTimestamp();

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`vc_rename_${member.id}`).setLabel('Rename').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_limit_${member.id}`).setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_lock_${member.id}`).setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_unlock_${member.id}`).setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
                    );

                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`vc_hide_${member.id}`).setLabel('Hide').setEmoji('👻').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_show_${member.id}`).setLabel('Show').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_permit_${member.id}`).setLabel('Permit').setEmoji('✅').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`vc_reject_${member.id}`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger)
                    );

                    const row3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`vc_kick_${member.id}`).setLabel('Kick').setEmoji('👞').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`vc_mute_${member.id}`).setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_unmute_${member.id}`).setLabel('Unmute').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`vc_claim_${member.id}`).setLabel('Claim').setEmoji('👑').setStyle(ButtonStyle.Primary)
                    );

                    await controlChannel.send({
                        content: `<@${member.id}>`,
                        embeds: [controlEmbed],
                        components: [row1, row2, row3]
                    });
                }
            } catch (error) {
                console.error('Error creating voice channel:', error);
            }
        }

        // User left a temporary voice channel
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            const channel = oldState.channel;
            if (channel && channel.name.includes("'s Room") && channel.members.size === 0) {
                try {
                    await channel.delete();
                    // Clean up map if needed (though we'd need to find the owner)
                } catch (error) {
                    console.error('Error deleting voice channel:', error);
                }
            }
        }
    }
};
