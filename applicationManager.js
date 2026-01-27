const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const persistence = require('./persistenceManager');
const DATA_PATH = path.join(persistence.dataDir, 'active_apps.json');
const COMPLETED_APPS_PATH = path.join(persistence.dataDir, 'completed_apps.json');
const locks = new Set(); 
const LOG_CHANNEL_ID = '1464393139417645203';

function loadApps() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveApps(apps) {
    try {
        const dir = path.dirname(DATA_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_PATH, JSON.stringify(apps, null, 2));
        console.log('[APP MANAGER] Saved application data successfully to ' + DATA_PATH);
    } catch (e) {
        console.error('[APP MANAGER] Error saving application data:', e);
        throw e; // Re-throw to be caught by the caller
    }
}

function loadCompletedApps() {
    try {
        if (fs.existsSync(COMPLETED_APPS_PATH)) {
            return JSON.parse(fs.readFileSync(COMPLETED_APPS_PATH, 'utf8'));
        }
    } catch (e) {}
    return [];
}

function saveCompletedApp(userId) {
    const completed = loadCompletedApps();
    if (!completed.includes(userId)) {
        completed.push(userId);
        fs.writeFileSync(COMPLETED_APPS_PATH, JSON.stringify(completed, null, 2));
    }
}

const questions = [
    { id: 'q1', label: '1. What is your age?', placeholder: 'e.g. 18', style: TextInputStyle.Short },
    { id: 'q2', label: '2. How long active in STB community?', placeholder: 'e.g. 6 months', style: TextInputStyle.Short },
    { id: 'q3', label: '3. What is your time zone?', placeholder: 'e.g. EST, GMT+1', style: TextInputStyle.Short },
    { id: 'q4', label: '4. Languages you read/write?', placeholder: 'e.g. English, Spanish', style: TextInputStyle.Short },
    { id: 'q5', label: '5. Have 2+ Fortnite accounts?', placeholder: 'Yes/No', style: TextInputStyle.Short },
    { id: 'q6', label: '6. Can record clips & stay online?', placeholder: 'Yes/No', style: TextInputStyle.Short },
    { id: 'q7', label: '7. Weekly availability?', placeholder: 'e.g. 10-15 hours', style: TextInputStyle.Short },
    { id: 'q8', label: '8. Any history of bans/scams?', placeholder: 'Yes/No (explain if yes)', style: TextInputStyle.Paragraph },
    { id: 'q9', label: '9. Explain history (if applicable)', placeholder: 'Leave blank if No above', style: TextInputStyle.Paragraph, required: false },
    { id: 'q10', label: '10. Any vouches?', placeholder: 'List names/servers or "None"', style: TextInputStyle.Paragraph },
    { id: 'q11', label: '11. Help with other MM services?', placeholder: 'Yes/No', style: TextInputStyle.Short }
];

module.exports = {
    showApplicationModal: async (interaction) => {
        const userId = interaction.user.id;
        
        // Check if already completed
        const completed = loadCompletedApps();
        if (completed.includes(userId)) {
            const completedEmbed = new EmbedBuilder()
                .setTitle('Application Already Submitted')
                .setDescription('❌ You have already submitted an application. You cannot apply more than once.')
                .setColor(0xFF0000);
            return await interaction.reply({ embeds: [completedEmbed], ephemeral: true });
        }

        // Check if in progress
        const apps = loadApps();
        if (apps[userId]) {
            const progressEmbed = new EmbedBuilder()
                .setTitle('Application In Progress')
                .setDescription(`⚠️ You already have an application in progress (Part ${apps[userId].step}/3). Please continue or cancel it first.`)
                .setColor(0xFFAA00);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`continue_mm_app_part_${apps[userId].step}`)
                        .setLabel(`Continue Part ${apps[userId].step}`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('cancel_mm_app_and_restart')
                        .setLabel('Cancel & Restart')
                        .setStyle(ButtonStyle.Danger)
                );

            return await interaction.reply({ embeds: [progressEmbed], components: [row], ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('mm_application_modal_1')
            .setTitle('MM Application (Part 1/3)');
        
        const rows = questions.slice(0, 5).map(q => {
            return new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(q.id)
                    .setLabel(q.label)
                    .setPlaceholder(q.placeholder)
                    .setStyle(q.style)
                    .setRequired(q.required !== false)
            );
        });

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    showApplicationModalPart2: async (interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('mm_application_modal_2')
            .setTitle('MM Application (Part 2/3)');

        const rows = questions.slice(5, 10).map(q => {
            return new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(q.id)
                    .setLabel(q.label)
                    .setPlaceholder(q.placeholder)
                    .setStyle(q.style)
                    .setRequired(q.required !== false)
            );
        });

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    showApplicationModalPart3: async (interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('mm_application_modal_3')
            .setTitle('MM Application (Part 3/3)');

        const rows = questions.slice(10, 11).map(q => {
            return new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(q.id)
                    .setLabel(q.label)
                    .setPlaceholder(q.placeholder)
                    .setStyle(q.style)
                    .setRequired(q.required !== false)
            );
        });

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    handleModalSubmit: async (interaction, part) => {
        try {
            const userId = interaction.user.id;
            console.log(`[APP MANAGER] Handling modal submit for user ${userId}, part ${part}`);
            
            let apps;
            try {
                apps = loadApps();
                console.log(`[APP MANAGER] Loaded ${Object.keys(apps).length} active applications`);
            } catch (error) {
                console.error('[APP MANAGER] CRITICAL: Failed to load applications:', error);
                if (!interaction.replied && !interaction.deferred) {
                    return await interaction.reply({ content: '❌ System error: Could not load application data.', ephemeral: true });
                } else {
                    return await interaction.editReply({ content: '❌ System error: Could not load application data.' });
                }
            }
        
        // Initialize if doesn't exist (for part 1) or verify it exists (for parts 2 & 3)
        if (!apps[userId]) {
            if (part > 1) {
                console.error(`[APP MANAGER] ERROR: No application data found for user ${userId} at part ${part}. Current apps keys: ${Object.keys(apps).join(', ')}`);
                // If user is submitting part 2 or 3 but no data exists, something went wrong
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Application Error')
                    .setDescription('❌ **No application data found.**\n\nThis can happen if the bot restarted or redeployed while you were applying. Please start from **Part 1** again. We apologize for the inconvenience!')
                    .setColor(0xFF0000);
                
                if (!interaction.replied && !interaction.deferred) {
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
            }
            console.log(`[APP MANAGER] Initializing new application for user ${userId}`);
            apps[userId] = { answers: {}, step: 1 };
        }

        const currentQuestions = part === 1 ? questions.slice(0, 5) : (part === 2 ? questions.slice(5, 10) : questions.slice(10, 11));
        
        // Save answers from current part
        console.log(`[APP MANAGER] Extracting answers for part ${part} for user ${userId}...`);
        for (const q of currentQuestions) {
            try {
                const value = interaction.fields.getTextInputValue(q.id);
                apps[userId].answers[q.id] = value;
                console.log(`[APP MANAGER] Captured ${q.id}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
            } catch (error) {
                console.error(`[APP MANAGER] Error getting field ${q.id} for user ${userId}:`, error.message);
                // If it's a required field and it's missing, that's a problem
                if (q.required !== false) {
                    throw new Error(`Required field ${q.id} (${q.label}) is missing in submission.`);
                }
            }
        }

        if (part < 3) {
            apps[userId].step = part + 1;
            console.log(`[APP MANAGER] User ${userId} completed part ${part}, moving to part ${part + 1}`);
            try {
                saveApps(apps);
            } catch (error) {
                console.error('[APP MANAGER] Failed to save apps after part completion:', error);
                return await interaction.reply({ content: '❌ System error: Could not save your progress.', ephemeral: true });
            }
            
            const nextPartEmbed = new EmbedBuilder()
                .setTitle('MM Application - Progress Saved')
                .setDescription(`✅ Part ${part} of 3 completed. Click the button below to continue to Part ${part + 1}.`)
                .setColor(0x00FF00);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`continue_mm_app_part_${part + 1}`)
                        .setLabel(`Continue to Part ${part + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [nextPartEmbed], components: [row], ephemeral: true });
        } else {
            console.log(`[APP MANAGER] User ${userId} completed final part 3. Deferring reply...`);
            
            // Defer the reply to give the bot more time for processing and logging
            await interaction.deferReply({ ephemeral: true });

            const finalData = apps[userId].answers;
            delete apps[userId];
            saveApps(apps);
            saveCompletedApp(userId);

            // Prepare the success message
            const gifUrl = 'https://share.creavite.co/6973ecb1bab97f02c66bd444.gif';
            
            const finishEmbed = new EmbedBuilder()
                .setTitle('Application Complete')
                .setDescription('✅ **Application Complete!** Thank you for applying. Our team will review your application soon.')
                .setColor(0x00FF00)
                .setImage(gifUrl);

            // Send the success message using editReply
            await interaction.editReply({ embeds: [finishEmbed] });
            console.log(`[APP MANAGER] Sent completion reply to user ${userId}`);

            // Then, send the log to the staff channel in the background
            try {
                const client = interaction.client;
                const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                if (channel) {
                    // Split questions into two embeds if they exceed field limits or for better readability
                    const logEmbed1 = new EmbedBuilder()
                        .setTitle('✨ New MM Trainee Application (Part 1)')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setColor(0x2B2D31)
                        .setDescription(`**Applicant:** ${interaction.user} (\`${interaction.user.id}\`)\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                        .addFields(
                            questions.slice(0, 5).map(q => ({
                                name: `🔹 ${q.label}`,
                                value: `\`\`\`\n${finalData[q.id] || 'No response provided'}\n\`\`\``,
                                inline: false
                            }))
                        );

                    const logEmbed2 = new EmbedBuilder()
                        .setTitle('✨ New MM Trainee Application (Part 2)')
                        .setColor(0x2B2D31)
                        .addFields(
                            questions.slice(5).map(q => ({
                                name: `🔹 ${q.label}`,
                                value: `\`\`\`\n${finalData[q.id] || 'No response provided'}\n\`\`\``,
                                inline: false
                            }))
                        )
                        .setFooter({ text: 'Supreme | MM Application System • FocusedOVP', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();

                    await channel.send({ embeds: [logEmbed1, logEmbed2] });
                    console.log(`[APP MANAGER] Successfully sent application log for ${userId} to channel ${LOG_CHANNEL_ID}`);
                } else {
                    console.error(`[APP MANAGER] Could not find log channel ${LOG_CHANNEL_ID}`);
                }
            } catch (logError) {
                console.error('[APP MANAGER] Error sending application log:', logError);
            }
        }
    } catch (error) {
        console.error('[APP MANAGER] Unhandled error in handleModalSubmit:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An unexpected error occurred. Please try again or contact staff.', ephemeral: true });
        } else {
            await interaction.editReply({ content: '❌ An unexpected error occurred while processing your submission. Please contact staff.' });
        }
    }
},

    isApplying: (userId) => {
        const apps = loadApps();
        return !!apps[userId];
    },
    
    getAppData: (userId) => {
        return loadApps()[userId];
    },

    cancelApplication: (userId) => {
        const apps = loadApps();
        delete apps[userId];
        saveApps(apps);
    }
};
