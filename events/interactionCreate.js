const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const appManager = require('../applicationManager.js');
const { generateAndSendTranscript } = require('../utils/transcriptGenerator.js');
const fs = require('fs');
const path = require('path');

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
        console.log(`[INTERACTION] Received ${interaction.type} from ${user.tag} (${user.id}) in ${channel?.name || 'DM'}`);

        if (interaction.isChatInputCommand()) {
            console.log(`[COMMAND] Executing /${interaction.commandName}`);
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        // ========== HANDLE MODAL SUBMISSIONS FIRST ==========
        if (interaction.isModalSubmit()) {
            console.log(`[MODAL] Processing modal submission: ${interaction.customId}`);
            
            // MM Application Modal Submissions
            if (interaction.customId === 'mm_application_modal_1') {
                return await appManager.handleModalSubmit(interaction, 1);
            }
            
            if (interaction.customId === 'mm_application_modal_2') {
                return await appManager.handleModalSubmit(interaction, 2);
            }
            
            if (interaction.customId === 'mm_application_modal_3') {
                return await appManager.handleModalSubmit(interaction, 3);
            }

            // Middleman Ticket Modal Handler
            if (interaction.customId === 'middleman_ticket_modal') {
                await interaction.deferReply({ ephemeral: true });
                
                const partner = interaction.fields.getTextInputValue('trading_partner');
                const type = interaction.fields.getTextInputValue('trade_type');
                const details = interaction.fields.getTextInputValue('trade_details');

                try {
                    const ticketChannel = await guild.channels.create({
                        name: `ticket-${user.username}`,
                        type: ChannelType.GuildText,
                        parent: CONFIG.TICKET_CATEGORY_ID,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                            ...CONFIG.ALLOWED_STAFF_ROLES.map(roleId => ({
                                id: roleId,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                            }))
                        ]
                    });

                    // Store ticket metadata in channel topic
                    const ticketData = {
                        creator: user.id,
                        createdAt: new Date().toISOString(),
                        partner,
                        type,
                        details
                    };
                    await ticketChannel.setTopic(JSON.stringify(ticketData));

                    const policyEmbed = new EmbedBuilder()
                        .setAuthor({ name: 'Supreme | MM', iconURL: CONFIG.SUPREME_LOGO })
                        .setTitle('Middleman Ticket Policy')
                        .setDescription('Welcome to your middleman ticket. Please follow these guidelines:\n\n• Be respectful and professional\n• Provide clear information about your trade\n• Wait for staff verification before proceeding\n• Do not share sensitive information')
                        .setColor('#00FFFF')
                        .setImage(CONFIG.BANNER_URL);

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('Close Ticket')
                                .setStyle(ButtonStyle.Danger)
                        );

                    const attachment = new AttachmentBuilder(CONFIG.BANNER_URL, { name: 'banner.gif' });
                    const staffMentions = CONFIG.ALLOWED_STAFF_ROLES.map(id => `<@&${id}>`).join(' ');
                    
                    await ticketChannel.send({ 
                        content: `${staffMentions}`, 
                        embeds: [policyEmbed], 
                        components: [row],
                        files: [attachment]
                    });

                    const detailsEmbed = new EmbedBuilder()
                        .setDescription(
                            '**Who are you trading with? (Name/ID)**\n' +
                            '```\n' + partner + '\n```\n' +
                            '**Trade Type? (Item/Item), (Item/Money)**\n' +
                            '```\n' + type + '\n```\n' +
                            '**Enter The Trade Below**\n' +
                            '```\n' + details + '\n```'
                        )
                        .setColor('#2B2D31');

                    await ticketChannel.send({ embeds: [detailsEmbed] });
                    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` });

                } catch (error) {
                    console.error('Ticket Creation Error:', error);
                    await interaction.editReply({ content: '❌ Failed to create ticket. Please contact staff.' });
                }
                return;
            }

            // Welcome Setup Modal Handler
            if (interaction.customId === 'welcome_setup_modal') {
                const description = interaction.fields.getTextInputValue('welcome_description');
                const tempKey = `temp_welcome_${user.id}`;
                const tempData = storage.get(guild.id, tempKey);

                if (!tempData) {
                    return interaction.reply({ content: '❌ **Error:** Setup data lost. Please try again.', flags: [MessageFlags.Ephemeral] });
                }

                const welcomeConfig = {
                    channelId: tempData.channelId,
                    bannerUrl: tempData.bannerUrl,
                    description: description
                };

                storage.set(guild.id, 'welcome_config', welcomeConfig);
                storage.delete(guild.id, tempKey);

                return interaction.reply({ content: '✅ **Welcome message configured successfully!**', flags: [MessageFlags.Ephemeral] });
            }
            return;
        }

        // ========== HANDLE BUTTONS AND SELECT MENUS ==========
        if (interaction.isButton() || interaction.isUserSelectMenu()) {
            const { customId } = interaction;

            // --- GIVEAWAY SYSTEM HANDLERS ---
            if (customId.startsWith('giveaway_entry_')) {
                const giveawayId = `giveaway_${interaction.message.id}`;
                let participants = storage.get(guild.id, giveawayId) || [];
                if (participants.includes(user.id)) {
                    return interaction.reply({ content: '❌ You have already entered this giveaway!', flags: [MessageFlags.Ephemeral] });
                }
                participants.push(user.id);
                storage.set(guild.id, giveawayId, participants);
                const oldEmbed = interaction.message.embeds[0];
                const newEmbed = EmbedBuilder.from(oldEmbed)
                    .setDescription(oldEmbed.description.replace(/Participants: \*\*\d+\*\*/, `Participants: **${participants.length}**`));
                await interaction.update({ embeds: [newEmbed] });
                return;
            }

            if (customId.startsWith('giveaway_participants_') || customId.startsWith('gw_page_')) {
                let giveawayMsgId, page, isUpdate;
                if (customId.startsWith('giveaway_participants_')) {
                    giveawayMsgId = interaction.message.id;
                    page = 0;
                    isUpdate = false;
                } else {
                    const parts = customId.split('_');
                    giveawayMsgId = parts[2];
                    page = parseInt(parts[3]);
                    isUpdate = true;
                }

                const giveawayId = `giveaway_${giveawayMsgId}`;
                const participants = storage.get(guild.id, giveawayId) || [];
                const totalPages = Math.ceil(participants.length / 10);
                const start = page * 10;
                const end = start + 10;
                const pageParticipants = participants.slice(start, end);

                const participantList = pageParticipants.length > 0 
                    ? pageParticipants.map((id, index) => `**${start + index + 1}.** <@${id}>`).join('\n')
                    : 'No participants yet.';

                const embed = new EmbedBuilder()
                    .setTitle('Giveaway Participants')
                    .setDescription(`The list of participants for this giveaway\n\n${participantList}`)
                    .setColor('#00FFFF')
                    .setFooter({ text: `Supreme Bot • Page ${page + 1} of ${Math.max(1, totalPages)}` })
                    .setTimestamp();

                const row = new ActionRowBuilder();
                if (totalPages > 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`gw_page_${giveawayMsgId}_${page - 1}`)
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId(`gw_page_${giveawayMsgId}_${page + 1}`)
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page >= totalPages - 1)
                    );
                }

                const responseData = { embeds: [embed], flags: [MessageFlags.Ephemeral] };
                if (row.components.length > 0) responseData.components = [row];

                if (isUpdate) {
                    await interaction.update(responseData);
                } else {
                    await interaction.reply(responseData);
                }
                return;
            }

            // 1. VERIFICATION SYSTEM
            if (customId === 'verify_user') {
                try {
                    if (member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
                        return interaction.reply({ content: '⚠️ **You are already verified!**', flags: [MessageFlags.Ephemeral] });
                    }
                    await member.roles.add(CONFIG.VERIFIED_ROLE_ID);
                    if (member.roles.cache.has(CONFIG.UNVERIFIED_ROLE_ID)) await member.roles.remove(CONFIG.UNVERIFIED_ROLE_ID);
                    return interaction.reply({ content: '✅ **You have been successfully verified!**', flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Verification Error:', error);
                    return interaction.reply({ content: '❌ **Failed to update your roles.**', flags: [MessageFlags.Ephemeral] });
                }
            }

            // 2. MIDDLEMAN TICKET MODAL TRIGGER
            if (customId === 'create_middleman_ticket') {
                const modal = new ModalBuilder()
                    .setCustomId('middleman_ticket_modal')
                    .setTitle('Create Middleman Ticket');

                const partnerInput = new TextInputBuilder()
                    .setCustomId('trading_partner')
                    .setLabel('Who are you trading with? (Name/ID)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. @Mention or 1234567890')
                    .setRequired(true);

                const typeInput = new TextInputBuilder()
                    .setCustomId('trade_type')
                    .setLabel('Trade Type? (Item/Item), (Item/Money)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('(Item/Item), (item/money)')
                    .setRequired(true);

                const detailsInput = new TextInputBuilder()
                    .setCustomId('trade_details')
                    .setLabel('Enter The Trade Below')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describe the items and quantities being traded...')
                    .setRequired(true);

                const firstRow = new ActionRowBuilder().addComponents(partnerInput);
                const secondRow = new ActionRowBuilder().addComponents(typeInput);
                const thirdRow = new ActionRowBuilder().addComponents(detailsInput);

                modal.addComponents(firstRow, secondRow, thirdRow);

                return await interaction.showModal(modal);
            }

            // 3. MM APPLICATION SYSTEM
            if (customId === 'start_mm_app_initial') {
                return await appManager.showApplicationModal(interaction);
            }

            if (customId === 'continue_mm_app_part_2') {
                return await appManager.showApplicationModalPart2(interaction);
            }

            if (customId === 'continue_mm_app_part_3') {
                return await appManager.showApplicationModalPart3(interaction);
            }

            if (customId === 'cancel_mm_app_and_restart') {
                appManager.cancelApplication(user.id);
                return await interaction.reply({ content: '✅ Your current application has been cancelled. You can now start a new one!', flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }

            // 4. CLOSE TICKET
            if (customId === 'close_ticket') {
                const canClose = member.roles.cache.some(role => CONFIG.CAN_CLOSE_ROLES.includes(role.id));
                if (!canClose) return await interaction.reply({ content: '❌ You do not have permission to close this ticket.', flags: [MessageFlags.Ephemeral] });

                // Prevent double-closing
                if (closingTickets.has(channel.id)) {
                    return await interaction.reply({ content: '⚠️ This ticket is already being closed.', flags: [MessageFlags.Ephemeral] });
                }
                closingTickets.add(channel.id);

                try { await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }); } catch (e) {}

                const closeEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Supreme', iconURL: CONFIG.SUPREME_LOGO })
                    .setTitle('Ticket Closed')
                    .setDescription(`Ticket Closed By ${user}\n\n📋 Generating transcript...\nThis channel will be deleted in 10 seconds.`)
                    .setColor('#FF0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [closeEmbed] });

                // Extract ticket data from channel topic
                let ticketData = {};
                try {
                    if (channel.topic) {
                        ticketData = JSON.parse(channel.topic);
                    }
                } catch (e) {
                    console.error('[TICKET] Failed to parse ticket data from topic:', e);
                }

                // Generate and send transcript
                try {
                    await generateAndSendTranscript(channel, user, ticketData);
                } catch (error) {
                    console.error('[TICKET] Failed to generate transcript:', error);
                }

                setTimeout(async () => { 
                    try { 
                        if (guild.channels.cache.has(channel.id)) {
                            await channel.delete();
                            closingTickets.delete(channel.id);
                        }
                    } catch (e) {
                        closingTickets.delete(channel.id);
                    }
                }, 10000);
                return;
            }
        }
    },
};
