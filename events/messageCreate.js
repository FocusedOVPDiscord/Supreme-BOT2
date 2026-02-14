const { Events, PermissionFlagsBits } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const groqAI = require('../utils/groqAI');

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
                    } else {
                        // If they sent a message but didn't mention anyone and didn't say cancel
                        const reply = await message.reply(`⚠️ Please **@mention** a user to perform this action, or type \`cancel\` to stop.`);
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    }
                }
                return;
            } else {
                // If anyone sends a message in the control room without an active action
                // We delete it to keep the room clean
                setTimeout(() => {
                    message.delete().catch(() => null);
                }, 1000);
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
        
        // Groq AI auto-response in ticket channels
        if (channelName && channelName.startsWith('ticket-')) {
            // Check if Groq AI is configured
            if (groqAI.isConfigured()) {
                // Don't respond to staff messages (let staff handle it)
                const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];
                const isStaff = message.member?.roles?.cache.some(role => STAFF_ROLE_IDS.includes(role.id));
                
                if (!isStaff) {
                    // Show typing indicator
                    await channel.sendTyping();

                    try {
                        const response = await groqAI.generateResponse(
                            author.id,
                            channel.id,
                            message.content
                        );

                        if (response) {
                            // Split response if too long (Discord limit is 2000 chars)
                            if (response.length > 2000) {
                                const chunks = response.match(/[\s\S]{1,2000}/g) || [];
                                for (const chunk of chunks) {
                                    await channel.send(chunk);
                                }
                            } else {
                                await channel.send(response);
                            }
                        }
                    } catch (error) {
                        console.error('[GROQ AI] Ticket auto-response error:', error);
                        // Silently fail - don't interrupt ticket flow
                    }
                }
            }
        }
    }
};
