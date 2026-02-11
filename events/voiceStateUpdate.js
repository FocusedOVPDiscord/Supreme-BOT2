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
                
                // Also store owner ID in channel topic/metadata if possible (for persistence)
                // Since voice channels don't have topics, we rely on the map and the name
                // But we'll make the name check more robust in interactionCreate.js
                
                console.log(`[VOICE] Created voice channel for ${member.user.tag} (${voiceChannel.id})`);

                // Control panel is now persistent, no need to send per channel
                console.log(`[VOICE] Voice channel created for ${member.user.tag}. Persistent control room is active.`);
            } catch (error) {
                console.error('Error creating voice channel:', error);
            }
        }

        // Handle temporary voice channel cleanup
        // We check both when someone leaves (oldState) and when someone joins/moves (newState)
        // to ensure we catch all empty channel scenarios
        const checkChannel = oldState.channel || newState.channel;
        
        if (checkChannel && checkChannel.name.includes("'s Room")) {
            // Re-fetch the channel to get the most up-to-date member count
            const channel = await guild.channels.fetch(checkChannel.id).catch(() => null);
            
            if (channel && channel.members.size === 0) {
                try {
                    console.log(`[VOICE] Deleting empty voice channel ${channel.name} (${channel.id})`);
                    
                    // Find the owner to clean up tracking
                    const ownerId = channelOwners.get(channel.id);
                    
                    // Delete the voice channel
                    await channel.delete();
                    
                    // Clean up tracking maps
                    if (ownerId) activeVoiceChannels.delete(ownerId);
                    channelOwners.delete(channel.id);
                    
                    console.log(`[VOICE] Successfully cleaned up empty voice channel.`);
                } catch (error) {
                    // Ignore 10003 (Unknown Channel) as it might already be deleted
                    if (error.code !== 10003) {
                        console.error('[VOICE] Error deleting voice channel:', error);
                    }
                }
            }
        }
    }
};
