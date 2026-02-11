const { Events, PermissionFlagsBits } = require('discord.js');
const storage = require('../commands/utility/storage.js');

const CONTROL_CHANNEL_ID = '1470577900540661925';

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const { guild, author, channel, mentions } = message;

        // Handle persistent control room mute/unmute logic
        if (channel.id === CONTROL_CHANNEL_ID) {
            const vcAction = storage.get(guild.id, `vc_action_${author.id}`);
            
            if (vcAction) {
                const targetUser = mentions.users.first();
                
                if (targetUser) {
                    try {
                        const voiceChannel = await guild.channels.fetch(vcAction.channelId).catch(() => null);
                        if (voiceChannel) {
                            if (vcAction.action === 'mute') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Speak]: false });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.setMute(true);
                                }
                                const reply = await message.reply(`✅ <@${targetUser.id}> has been **muted** in your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'unmute') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Speak]: true });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.setMute(false);
                                }
                                const reply = await message.reply(`✅ <@${targetUser.id}> has been **unmuted** in your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'permit') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Connect]: true, [PermissionFlagsBits.ViewChannel]: true });
                                const reply = await message.reply(`✅ <@${targetUser.id}> is now **permitted** to join your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'reject') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Connect]: false, [PermissionFlagsBits.ViewChannel]: false });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) await targetMember.voice.disconnect();
                                const reply = await message.reply(`❌ <@${targetUser.id}> has been **rejected** from your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'kick') {
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.disconnect();
                                    const reply = await message.reply(`👞 <@${targetUser.id}> has been **kicked** from your room.`);
                                    setTimeout(() => {
                                        message.delete().catch(() => null);
                                        reply.delete().catch(() => null);
                                    }, 5000);
                                } else {
                                    const reply = await message.reply("❌ That user is not in your voice channel.");
                                    setTimeout(() => {
                                        message.delete().catch(() => null);
                                        reply.delete().catch(() => null);
                                    }, 5000);
                                }
                            }
                        } else {
                            const reply = await message.reply("❌ Your voice channel no longer exists.");
                            setTimeout(() => {
                                message.delete().catch(() => null);
                                reply.delete().catch(() => null);
                            }, 5000);
                        }
                    } catch (err) {
                        console.error('[VOICE CONTROL] Error:', err);
                        const reply = await message.reply("❌ An error occurred while processing the request.");
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    } finally {
                        // Re-lock the channel for the owner
                        await channel.permissionOverwrites.edit(author.id, { [PermissionFlagsBits.SendMessages]: false });
                        // Clear the action state
                        await storage.delete(guild.id, `vc_action_${author.id}`);
                    }
                } else {
                    // If they sent a message but didn't mention anyone, we might want to wait or cancel
                    // For now, let's just cancel if it's not a mention to avoid locking them out without a way to finish
                    if (message.content.toLowerCase() === 'cancel') {
                        await channel.permissionOverwrites.edit(author.id, { [PermissionFlagsBits.SendMessages]: false });
                        await storage.delete(guild.id, `vc_action_${author.id}`);
                        const reply = await message.reply("❌ Action cancelled. Channel re-locked.");
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    }
                }
                return;
            }
        }

        // Handle DM responses for MM Application
        if (!message.guild && message.channel.type === 1) {
            const appManager = require('../applicationManager.js');
            await appManager.handleDMResponse(message, message.client);
            return;
        }
        
        const channelName = channel.name;
        
        // Only process messages in ticket channels if needed
        if (!channelName || !channelName.startsWith('ticket-')) return;
    }
};
