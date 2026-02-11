const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const appManager = require('../applicationManager.js');
const { generateAndSendTranscript } = require('../utils/transcriptGenerator.js');
const fs = require('fs');
const path = require('path');
const { getPath } = require('../pathConfig');

const CONFIG = {
    ALLOWED_STAFF_ROLES: ['1457664338163667072', '1410661468688482314', '1354402446994309123'],
    VERIFIED_ROLE_ID: '1354402996724957226',
    UNVERIFIED_ROLE_ID: '1460419821798686751',
    TICKET_CATEGORY_ID: '1458907554573844715',
    CAN_CLOSE_ROLES: ['982731220913913856', '1457664338163667072'],
    DOT_EMOJI: '<:dot:1460754381447237785>',
    SUPREME_LOGO: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp',
    BANNER_URL: 'https://share.creavite.co/695b62345e75e9c085840fa9.gif'
};

const closingTickets = new Set();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const { guild, user, member, client, channel } = interaction;

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('mm_app_select_')) {
                return await appManager.handleSelectResponse(interaction, client);
            }
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                if (error.code === 10062) {
                    console.warn(`⚠️ [INTERACTION] Interaction ${interaction.id} expired before command execution.`);
                    return;
                }
                console.error('❌ [COMMAND ERROR]:', error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                    }
                } catch (e) {
                    console.error('❌ [REPLY ERROR]: Could not send error message to user:', e.message);
                }
            }
        }

        if (interaction.isModalSubmit()) {
            const { customId, guild, member, user } = interaction;

            // --- VOICE CONTROL MODAL HANDLERS ---
            if (customId.startsWith('vc_')) {
                const voiceChannel = member.voice.channel;
                if (!voiceChannel || !voiceChannel.name.includes("'s Room")) {
                    return interaction.reply({ content: "You must be in your voice channel!", flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_rename_modal_')) {
                    const newName = interaction.fields.getTextInputValue('new_name');
                    await voiceChannel.setName(`🔊 ${newName}`);
                    return interaction.reply({ content: `✅ Room renamed to **${newName}**`, flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_limit_modal_')) {
                    const limit = parseInt(interaction.fields.getTextInputValue('new_limit'));
                    if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: "Invalid limit (0-99)", flags: [MessageFlags.Ephemeral] });
                    await voiceChannel.setUserLimit(limit);
                    return interaction.reply({ content: `✅ User limit set to **${limit}**`, flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_permit_modal_')) {
                    const targetId = interaction.fields.getTextInputValue('user_id');
                    await voiceChannel.permissionOverwrites.edit(targetId, { [PermissionFlagsBits.Connect]: true, [PermissionFlagsBits.ViewChannel]: true });
                    return interaction.reply({ content: `✅ <@${targetId}> is now permitted to join.`, flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_reject_modal_')) {
                    const targetId = interaction.fields.getTextInputValue('user_id');
                    await voiceChannel.permissionOverwrites.edit(targetId, { [PermissionFlagsBits.Connect]: false, [PermissionFlagsBits.ViewChannel]: false });
                    const targetMember = await guild.members.fetch(targetId).catch(() => null);
                    if (targetMember && targetMember.voice.channelId === voiceChannel.id) await targetMember.voice.disconnect();
                    return interaction.reply({ content: `✅ <@${targetId}> has been rejected.`, flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_kick_modal_')) {
                    const targetId = interaction.fields.getTextInputValue('user_id');
                    const targetMember = await guild.members.fetch(targetId).catch(() => null);
                    if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                        await targetMember.voice.disconnect();
                        return interaction.reply({ content: `✅ <@${targetId}> has been kicked.`, flags: [MessageFlags.Ephemeral] });
                    }
                    return interaction.reply({ content: "User not found in your channel.", flags: [MessageFlags.Ephemeral] });
                }

                if (customId.startsWith('vc_mute_modal_')) {
                    const targetId = interaction.fields.getTextInputValue('user_id');
                    const targetMember = await guild.members.fetch(targetId).catch(() => null);
                    if (targetMember) {
                        // Logic: Unlock for them, Mute them, then Lock again
                        // Discord's permission system handles this via overwrites
                        await voiceChannel.permissionOverwrites.edit(targetId, { [PermissionFlagsBits.Speak]: false });
                        if (targetMember.voice.channelId === voiceChannel.id) await targetMember.voice.setMute(true);
                        return interaction.reply({ content: `✅ <@${targetId}> has been muted.`, flags: [MessageFlags.Ephemeral] });
                    }
                }

                if (customId.startsWith('vc_unmute_modal_')) {
                    const targetId = interaction.fields.getTextInputValue('user_id');
                    const targetMember = await guild.members.fetch(targetId).catch(() => null);
                    if (targetMember) {
                        await voiceChannel.permissionOverwrites.edit(targetId, { [PermissionFlagsBits.Speak]: true });
                        if (targetMember.voice.channelId === voiceChannel.id) await targetMember.voice.setMute(false);
                        return interaction.reply({ content: `✅ <@${targetId}> has been unmuted.`, flags: [MessageFlags.Ephemeral] });
                    }
                }
            }

            if (interaction.customId.startsWith('mm_app_accept_modal_')) {
                const applicantId = interaction.customId.replace('mm_app_accept_modal_', '');
                const reason = interaction.fields.getTextInputValue('accept_reason');
                const applicant = await client.users.fetch(applicantId).catch(() => null);
                
                const acceptEmbed = new EmbedBuilder()
                    .setTitle('MM Application Accepted')
                    .setDescription(`Congratulations! Your MM application has been **Accepted**.\n\n**Reason:** ${reason}`)
                    .setColor(0x00FF00)
                    .setTimestamp();

                if (applicant) await applicant.send({ embeds: [acceptEmbed] }).catch(() => null);
                
                const logEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0x00FF00)
                    .setTitle('MM Application - Accepted')
                    .addFields({ name: 'Decision by', value: `${user.tag}`, inline: true }, { name: 'Reason', value: reason });

                await interaction.update({ embeds: [logEmbed], components: [] });
                return;
            }

            if (interaction.customId.startsWith('mm_app_deny_modal_')) {
                const applicantId = interaction.customId.replace('mm_app_deny_modal_', '');
                const reason = interaction.fields.getTextInputValue('deny_reason');
                const applicant = await client.users.fetch(applicantId).catch(() => null);
                
                const denyEmbed = new EmbedBuilder()
                    .setTitle('MM Application Denied')
                    .setDescription(`We regret to inform you that your MM application has been **Denied**.\n\n**Reason:** ${reason}`)
                    .setColor(0xFF0000)
                    .setTimestamp();

                if (applicant) await applicant.send({ embeds: [denyEmbed] }).catch(() => null);
                
                const logEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0xFF0000)
                    .setTitle('MM Application - Denied')
                    .addFields({ name: 'Decision by', value: `${user.tag}`, inline: true }, { name: 'Reason', value: reason });

                await interaction.update({ embeds: [logEmbed], components: [] });
                return;
            }

            if (interaction.customId === 'middleman_ticket_modal') {
                await interaction.deferReply({ ephemeral: true });
                const partner = interaction.fields.getTextInputValue('trading_partner');
                const type = interaction.fields.getTextInputValue('trade_type');
                const details = interaction.fields.getTextInputValue('trade_details');

                try {
                    let ticketCount = parseInt(storage.get(guild.id, 'ticketCount')) || 0;
                    ticketCount++;
                    await storage.set(guild.id, 'ticketCount', ticketCount);
                    
                    const ticketNumber = ticketCount.toString().padStart(4, '0');
                    const ticketCategoryId = storage.get(guild.id, 'ticketCategory') || CONFIG.TICKET_CATEGORY_ID;
                    const ticketChannel = await guild.channels.create({
                        name: `ticket-${ticketNumber}`,
                        type: ChannelType.GuildText,
                        parent: ticketCategoryId,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                            ...CONFIG.ALLOWED_STAFF_ROLES.map(roleId => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
                        ]
                    });

                    const ticketData = { creator: user.id, createdAt: new Date().toISOString(), partner, type, details, number: ticketNumber };
                    await ticketChannel.setTopic(JSON.stringify(ticketData));

                    // Store ticket metadata in persistent storage for dashboard
                    const activeTickets = storage.get(guild.id, 'active_tickets') || {};
                    activeTickets[ticketChannel.id] = {
                        id: ticketChannel.id,
                        user: user.username,
                        userId: user.id,
                        created: new Date().toISOString(),
                        status: 'Active',
                        ticketNumber: ticketNumber,
                        partner,
                        type,
                        details
                    };
                    await storage.set(guild.id, 'active_tickets', activeTickets);

                    const policyEmbed = new EmbedBuilder()
                        .setAuthor({ name: 'Supreme | MM', iconURL: CONFIG.SUPREME_LOGO })
                        .setTitle('Middleman Ticket Policy')
                        .setDescription('Welcome to your middleman ticket. Please follow these guidelines:\n\n• Be respectful and professional\n• Provide clear information about your trade\n• Wait for staff verification before proceeding\n• Do not share sensitive information')
                        .setColor('#00FFFF')
                        .setImage('attachment://banner.gif');

                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));
                    const attachment = new AttachmentBuilder(CONFIG.BANNER_URL, { name: 'banner.gif' });
                    const staffMentions = CONFIG.ALLOWED_STAFF_ROLES.map(id => `<@&${id}>`).join(' ');
                    
                    await ticketChannel.send({ content: `${staffMentions}`, embeds: [policyEmbed], components: [row], files: [attachment] });
                    const detailsEmbed = new EmbedBuilder().setDescription(`**Who are you trading with? (Name/ID)**\n\`\`\`\n${partner}\n\`\`\`\n**Trade Type? (Item/Item), (Item/Money)**\n\`\`\`\n${type}\n\`\`\`\n**Enter The Trade Below**\n\`\`\`\n${details}\n\`\`\``).setColor('#2B2D31');
                    await ticketChannel.send({ embeds: [detailsEmbed] });
                    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` });
                } catch (error) {
                    console.error('Ticket Creation Error:', error);
                    await interaction.editReply({ content: '❌ Failed to create ticket.' });
                }
                return;
            }

            if (interaction.customId === 'welcome_setup_modal') {
                const description = interaction.fields.getTextInputValue('welcome_description');
                const tempKey = `temp_welcome_${user.id}`;
                const tempData = storage.get(guild.id, tempKey);
                if (!tempData) return interaction.reply({ content: '❌ Error: Setup data lost.', flags: [MessageFlags.Ephemeral] });
                const welcomeConfig = { channelId: tempData.channelId, bannerUrl: tempData.bannerUrl, description: description };
                await storage.set(guild.id, 'welcome_config', welcomeConfig);
                await storage.delete(guild.id, tempKey);
                return interaction.reply({ content: '✅ Welcome message configured!', flags: [MessageFlags.Ephemeral] });
            }
        }

        if (interaction.isButton()) {
            const { customId } = interaction;

            // --- VOICE CHANNEL CONTROL HANDLERS ---
            if (customId.startsWith('vc_')) {
                const [prefix, action, idPart] = customId.split('_');
                const voiceChannel = member.voice.channel;

                // For 'claim', we handle it separately as the user might not be the owner yet
                if (action === 'claim') {
                    if (!voiceChannel || !voiceChannel.name.includes("'s Room")) {
                        return interaction.reply({ content: "❌ You must be in a temporary voice channel to claim it!", flags: [MessageFlags.Ephemeral] });
                    }
                    // Logic to claim if owner left (handled in switch)
                } else {
                    // For all other actions, user MUST be in their own room
                    if (!voiceChannel) {
                        return interaction.reply({ content: "❌ You must be in your voice channel to use these controls!", flags: [MessageFlags.Ephemeral] });
                    }
                    
                    // Improved detection: Check if the user's username is in the channel name
                    // We use a more flexible check to avoid issues with symbols or prefixes
                    // We also check if the user has ManageChannels permission in that specific channel
                    const isOwnerByName = voiceChannel.name.toLowerCase().includes(user.username.toLowerCase());
                    const hasManagePerms = voiceChannel.permissionsFor(user).has(PermissionFlagsBits.ManageChannels);
                    
                    if (!voiceChannel.name.includes("'s Room") || (!isOwnerByName && !hasManagePerms)) {
                        return interaction.reply({ content: "❌ You can only control your own temporary voice channel!", flags: [MessageFlags.Ephemeral] });
                    }
                }
                
                switch (action) {
                    case 'lock':
                        await voiceChannel.permissionOverwrites.edit(guild.id, { [PermissionFlagsBits.Connect]: false });
                        return interaction.reply({ content: "🔒 Channel locked for everyone.", flags: [MessageFlags.Ephemeral] });
                    
                    case 'unlock':
                        await voiceChannel.permissionOverwrites.edit(guild.id, { [PermissionFlagsBits.Connect]: true });
                        return interaction.reply({ content: "🔓 Channel unlocked for everyone.", flags: [MessageFlags.Ephemeral] });

                    case 'hide':
                        await voiceChannel.permissionOverwrites.edit(guild.id, { [PermissionFlagsBits.ViewChannel]: false });
                        return interaction.reply({ content: "👻 Channel hidden from everyone.", flags: [MessageFlags.Ephemeral] });

                    case 'show':
                        await voiceChannel.permissionOverwrites.edit(guild.id, { [PermissionFlagsBits.ViewChannel]: true });
                        return interaction.reply({ content: "👁️ Channel is now visible.", flags: [MessageFlags.Ephemeral] });

                    case 'rename':
                        const renameModal = new ModalBuilder()
                            .setCustomId(`vc_rename_modal_${user.id}`)
                            .setTitle('Rename Your Room');
                        const nameInput = new TextInputBuilder()
                            .setCustomId('new_name')
                            .setLabel('New Room Name')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('e.g. Chill Zone')
                            .setRequired(true);
                        renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                        return await interaction.showModal(renameModal);

                    case 'limit':
                        const limitModal = new ModalBuilder()
                            .setCustomId(`vc_limit_modal_${user.id}`)
                            .setTitle('Set User Limit');
                        const limitInput = new TextInputBuilder()
                            .setCustomId('new_limit')
                            .setLabel('User Limit (0-99)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('0 for no limit')
                            .setRequired(true);
                        limitModal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                        return await interaction.showModal(limitModal);

                    case 'permit':
                        await channel.permissionOverwrites.edit(user.id, { [PermissionFlagsBits.SendMessages]: true });
                        await interaction.reply({ content: "✅ Channel unlocked! Please **@mention** the user you want to **permit**.", flags: [MessageFlags.Ephemeral] });
                        await storage.set(guild.id, `vc_action_${user.id}`, { action: 'permit', channelId: voiceChannel.id });
                        return;

                    case 'reject':
                        await channel.permissionOverwrites.edit(user.id, { [PermissionFlagsBits.SendMessages]: true });
                        await interaction.reply({ content: "❌ Channel unlocked! Please **@mention** the user you want to **reject**.", flags: [MessageFlags.Ephemeral] });
                        await storage.set(guild.id, `vc_action_${user.id}`, { action: 'reject', channelId: voiceChannel.id });
                        return;

                    case 'kick':
                        await channel.permissionOverwrites.edit(user.id, { [PermissionFlagsBits.SendMessages]: true });
                        await interaction.reply({ content: "👞 Channel unlocked! Please **@mention** the user you want to **kick**.", flags: [MessageFlags.Ephemeral] });
                        await storage.set(guild.id, `vc_action_${user.id}`, { action: 'kick', channelId: voiceChannel.id });
                        return;

                    case 'mute':
                        // Unlock channel for the owner to mention
                        await channel.permissionOverwrites.edit(user.id, { [PermissionFlagsBits.SendMessages]: true });
                        await interaction.reply({ content: "🔊 Channel unlocked! Please **@mention** the user you want to **mute**.", flags: [MessageFlags.Ephemeral] });
                        
                        // Store state for messageCreate
                        await storage.set(guild.id, `vc_action_${user.id}`, { action: 'mute', channelId: voiceChannel.id });
                        return;

                    case 'unmute':
                        // Unlock channel for the owner to mention
                        await channel.permissionOverwrites.edit(user.id, { [PermissionFlagsBits.SendMessages]: true });
                        await interaction.reply({ content: "🔊 Channel unlocked! Please **@mention** the user you want to **unmute**.", flags: [MessageFlags.Ephemeral] });
                        
                        // Store state for messageCreate
                        await storage.set(guild.id, `vc_action_${user.id}`, { action: 'unmute', channelId: voiceChannel.id });
                        return;

                    case 'claim':
                        if (voiceChannel && voiceChannel.name.includes("'s Room")) {
                            // Check if the current owner is still in the channel
                            const ownerNamePart = voiceChannel.name.split("'s")[0].replace('🔊 ', '').toLowerCase();
                            const isCurrentOwnerInChannel = voiceChannel.members.some(m => m.user.username.toLowerCase() === ownerNamePart);
                            
                            if (isCurrentOwnerInChannel) {
                                return interaction.reply({ content: "❌ The owner is still in this room! You cannot claim it.", flags: [MessageFlags.Ephemeral] });
                            }

                            // If owner is gone, allow the new user to claim it
                            try {
                                await voiceChannel.setName(`🔊 ${user.username}'s Room`);
                                
                                // Give the new owner full permissions
                                await voiceChannel.permissionOverwrites.edit(user.id, {
                                    [PermissionFlagsBits.Connect]: true,
                                    [PermissionFlagsBits.Speak]: true,
                                    [PermissionFlagsBits.Stream]: true,
                                    [PermissionFlagsBits.MuteMembers]: true,
                                    [PermissionFlagsBits.DeafenMembers]: true,
                                    [PermissionFlagsBits.MoveMembers]: true,
                                    [PermissionFlagsBits.ManageChannels]: true
                                });

                                return interaction.reply({ content: `👑 You have successfully claimed this room! It is now **${user.username}'s Room**.`, flags: [MessageFlags.Ephemeral] });
                            } catch (err) {
                                console.error('[VOICE CLAIM] Error:', err);
                                return interaction.reply({ content: "❌ Failed to claim the room. Please try again.", flags: [MessageFlags.Ephemeral] });
                            }
                        }
                        return interaction.reply({ content: "❌ You must be in a temporary voice channel to claim it.", flags: [MessageFlags.Ephemeral] });
                }
            }


            // Giveaway Buttons
            if (customId.startsWith('giveaway_entry_')) {
                const parts = customId.split('_');
                const endTime = parseInt(parts[2]);
                const winnersCount = parseInt(parts[3]);
                
                if (Date.now() > endTime * 1000) {
                    return interaction.reply({ content: '❌ This giveaway has already ended!', flags: [MessageFlags.Ephemeral] });
                }

                const giveawayId = `giveaway_${interaction.message.id}`;
                const participants = storage.get(guild.id, giveawayId) || [];

                if (participants.includes(user.id)) {
                    // Remove entry
                    const index = participants.indexOf(user.id);
                    participants.splice(index, 1);
                    await storage.set(guild.id, giveawayId, participants);
                    
                    await interaction.reply({ content: '✅ Your entry has been removed.', flags: [MessageFlags.Ephemeral] });
                } else {
                    // Add entry
                    participants.push(user.id);
                    await storage.set(guild.id, giveawayId, participants);
                    
                    await interaction.reply({ content: '✅ You have entered the giveaway!', flags: [MessageFlags.Ephemeral] });
                }

                // Update the giveaway message embed
                const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                const description = embed.data.description;
                const newDescription = description.replace(/Participants: \*\*\d+\*\*/, `Participants: **${participants.length}**`);
                embed.setDescription(newDescription);
                
                await interaction.message.edit({ embeds: [embed] });
                return;
            }

            if (customId.startsWith('giveaway_participants_')) {
                const giveawayId = `giveaway_${interaction.message.id}`;
                const participants = storage.get(guild.id, giveawayId) || [];
                
                if (participants.length === 0) {
                    return interaction.reply({ content: 'There are currently no participants in this giveaway.', flags: [MessageFlags.Ephemeral] });
                }

                const participantList = participants.map(id => `<@${id}>`).join(', ');
                const listEmbed = new EmbedBuilder()
                    .setTitle('Giveaway Participants')
                    .setDescription(participantList.length > 2000 ? participantList.substring(0, 1997) + '...' : participantList)
                    .setColor('#5865F2');

                return interaction.reply({ embeds: [listEmbed], flags: [MessageFlags.Ephemeral] });
            }

            if (customId.startsWith('mm_app_accept_')) {
                const applicantId = customId.replace('mm_app_accept_', '');
                const modal = new ModalBuilder().setCustomId(`mm_app_accept_modal_${applicantId}`).setTitle('Accept MM Application');
                const reasonInput = new TextInputBuilder().setCustomId('accept_reason').setLabel('Reason for Acceptance').setStyle(TextInputStyle.Paragraph).setPlaceholder('e.g. Great history and vouches.').setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                try {
                    return await interaction.showModal(modal);
                } catch (error) {
                    if (error.code === 10062) return console.warn('⚠️ [MODAL] Interaction expired before showing accept modal.');
                    throw error;
                }
            }

            if (customId.startsWith('mm_app_deny_')) {
                const applicantId = customId.replace('mm_app_deny_', '');
                const modal = new ModalBuilder().setCustomId(`mm_app_deny_modal_${applicantId}`).setTitle('Deny MM Application');
                const reasonInput = new TextInputBuilder().setCustomId('deny_reason').setLabel('Reason for Denial').setStyle(TextInputStyle.Paragraph).setPlaceholder('e.g. Not enough experience.').setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                try {
                    return await interaction.showModal(modal);
                } catch (error) {
                    if (error.code === 10062) return console.warn('⚠️ [MODAL] Interaction expired before showing deny modal.');
                    throw error;
                }
            }

            if (customId === 'verify_user') {
                try {
                    if (member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) return interaction.reply({ content: '⚠️ Already verified!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                    await member.roles.add(CONFIG.VERIFIED_ROLE_ID);
                    if (member.roles.cache.has(CONFIG.UNVERIFIED_ROLE_ID)) await member.roles.remove(CONFIG.UNVERIFIED_ROLE_ID);
                    return interaction.reply({ content: '✅ Verified!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                } catch (error) {
                    if (error.code === 10062) return;
                    return interaction.reply({ content: '❌ Failed to update roles.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
            }

            if (customId === 'create_middleman_ticket') {
                const modal = new ModalBuilder().setCustomId('middleman_ticket_modal').setTitle('Create Middleman Ticket');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trading_partner').setLabel('Who are you trading with? (Name/ID)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_type').setLabel('Trade Type? (Item/Item), (Item/Money)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('Enter The Trade Below').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                try {
                    return await interaction.showModal(modal);
                } catch (error) {
                    if (error.code === 10062) return console.warn('⚠️ [MODAL] Interaction expired before showing ticket modal.');
                    throw error;
                }
            }

            if (customId === 'start_mm_app_initial') return await appManager.startDMApplication(interaction);
            if (customId === 'confirm_start_mm_app') {
                await interaction.deferUpdate();
                return await appManager.askNextQuestion(interaction.user, client, 0, interaction);
            }
            if (customId === 'cancel_mm_app_and_restart') return await appManager.cancelAndRestart(interaction);
            if (customId === 'stop_mm_app') return await appManager.stopApplication(interaction);

            if (customId === 'close_ticket') {
                const canClose = member.roles.cache.some(role => CONFIG.CAN_CLOSE_ROLES.includes(role.id));
                if (!canClose) return await interaction.reply({ content: '❌ No permission.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                if (closingTickets.has(channel.id)) return await interaction.reply({ content: '⚠️ Already closing.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                
                closingTickets.add(channel.id);
                try { await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }); } catch (e) {}
                
                const closeEmbed = new EmbedBuilder().setAuthor({ name: 'Supreme', iconURL: CONFIG.SUPREME_LOGO }).setTitle('Ticket Closed').setDescription(`Ticket Closed By ${user}\n\n📋 Generating transcript...\nDeleting in 10s.`).setColor('#FF0000').setTimestamp();
                
                try {
                    await interaction.reply({ embeds: [closeEmbed] });
                } catch (error) {
                    if (error.code === 10062) console.warn('⚠️ [TICKET] Interaction expired before closing reply.');
                    else console.error('❌ [TICKET ERROR]:', error);
                }

                let ticketData = {};
                try { if (channel.topic) ticketData = JSON.parse(channel.topic); } catch (e) {}
                try { await generateAndSendTranscript(channel, user, ticketData); } catch (error) {}

                // Remove from active tickets storage
                const activeTickets = storage.get(guild.id, 'active_tickets') || {};
                if (activeTickets[channel.id]) {
                    delete activeTickets[channel.id];
                    await storage.set(guild.id, 'active_tickets', activeTickets);
                }
                
                setTimeout(async () => { 
                    try { 
                        if (guild.channels.cache.has(channel.id)) await channel.delete(); 
                    } catch (e) {
                        console.error('❌ [TICKET DELETE ERROR]:', e.message);
                    } finally { 
                        closingTickets.delete(channel.id); 
                    } 
                }, 10000);
                return;
            }
        }
    },
};
