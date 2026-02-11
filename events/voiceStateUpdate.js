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
const activeVoiceChannels = new Map(); // ownerId -> { channelId, controlMessageId }
const channelOwners = new Map(); // channelId -> ownerId

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
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel], // Public by default
                        },
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.Connect, 
                                PermissionFlagsBits.Speak, 
                                PermissionFlagsBits.Stream,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.ManageChannels // Allow owner to manage
                            ],
                        },
                    ],
                });

                // Move member to the new channel
                await member.voice.setChannel(voiceChannel);
                
                // Track the channel and owner
                activeVoiceChannels.set(member.id, { channelId: voiceChannel.id, controlMessageId: null });
                channelOwners.set(voiceChannel.id, member.id);
                
                console.log(`[VOICE] Created voice channel for ${member.user.tag} (${voiceChannel.id})`);

                // Control panel is now persistent, no need to send per channel
                console.log(`[VOICE] Voice channel created for ${member.user.tag}. Persistent control room is active.`);
            } catch (error) {
                console.error('Error creating voice channel:', error);
            }
        }

        // User left a temporary voice channel
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            const channel = oldState.channel;
            
            // Check if this is a tracked temporary voice channel
            const ownerId = channelOwners.get(oldState.channelId);
            
            if (channel && ownerId && channel.members.size === 0) {
                try {
                    console.log(`[VOICE] Deleting empty voice channel ${channel.name} (${channel.id})`);
                    
                    // Control panel is persistent, no need to delete per channel
                    console.log(`[VOICE] Voice channel for ${ownerId} deleted. Persistent control room remains.`);
                    
                    // Delete the voice channel
                    await channel.delete();
                    
                    // Clean up tracking maps
                    activeVoiceChannels.delete(ownerId);
                    channelOwners.delete(oldState.channelId);
                    
                    console.log(`[VOICE] Successfully cleaned up voice channel for ${ownerId}`);
                } catch (error) {
                    console.error('[VOICE] Error deleting voice channel:', error);
                }
            }
        }
    }
};
