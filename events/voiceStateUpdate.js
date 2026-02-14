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
                
                // Ensure owner permissions are explicitly set and persist
                await voiceChannel.permissionOverwrites.edit(member.id, {
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true,
                    [PermissionFlagsBits.Stream]: true,
                    [PermissionFlagsBits.MuteMembers]: true,
                    [PermissionFlagsBits.DeafenMembers]: true,
                    [PermissionFlagsBits.MoveMembers]: true,
                    [PermissionFlagsBits.ManageChannels]: true,
                    [PermissionFlagsBits.ViewChannel]: true
                });
                
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

        // Handle temporary voice channel cleanup
        // We check both when someone leaves (oldState) and when someone joins/moves (newState)
        // to ensure we catch all empty channel scenarios
        const checkChannel = oldState.channel || newState.channel;
        
        // Re-apply owner permissions when someone joins to ensure they persist
        if (newState.channelId && channelOwners.has(newState.channelId)) {
            const ownerId = channelOwners.get(newState.channelId);
            const channel = newState.channel;
            
            // Re-apply owner permissions to ensure they persist
            try {
                await channel.permissionOverwrites.edit(ownerId, {
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true,
                    [PermissionFlagsBits.Stream]: true,
                    [PermissionFlagsBits.MuteMembers]: true,
                    [PermissionFlagsBits.DeafenMembers]: true,
                    [PermissionFlagsBits.MoveMembers]: true,
                    [PermissionFlagsBits.ManageChannels]: true,
                    [PermissionFlagsBits.ViewChannel]: true
                });
                console.log(`[VOICE] Re-applied owner permissions for ${ownerId} in ${channel.name}`);
            } catch (error) {
                console.error('[VOICE] Error re-applying owner permissions:', error);
            }
        }
        
        // Check if this is a tracked temporary voice channel (instead of relying on name pattern)
        if (checkChannel && channelOwners.has(checkChannel.id)) {
            // Add a small delay to ensure Discord has updated the member list
            await new Promise(resolve => setTimeout(resolve, 1000));
            
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
    },
    
    // Export the maps so other modules can access them
    getChannelOwners: () => channelOwners,
    getActiveVoiceChannels: () => activeVoiceChannels
};
