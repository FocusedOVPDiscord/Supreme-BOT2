const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getPath, DATA_DIR } = require('./pathConfig');

const DATA_PATH = getPath('active_apps.json');
const COMPLETED_APPS_PATH = getPath('completed_apps.json');
const LOG_CHANNEL_ID = '1464393139417645203';

function loadApps() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const content = fs.readFileSync(DATA_PATH, 'utf8');
            return content ? JSON.parse(content) : {};
        }
    } catch (e) {
        console.error('[APP MANAGER] Error loading active apps:', e);
    }
    return {};
}

function saveApps(apps) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = `${DATA_PATH}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(apps, null, 2));
        fs.renameSync(tempPath, DATA_PATH);
    } catch (e) {
        console.error('[APP MANAGER] Error saving application data:', e);
    }
}

function loadCompletedApps() {
    try {
        if (fs.existsSync(COMPLETED_APPS_PATH)) {
            const content = fs.readFileSync(COMPLETED_APPS_PATH, 'utf8');
            return content ? JSON.parse(content) : [];
        }
    } catch (e) {
        console.error('[APP MANAGER] Error loading completed apps:', e);
    }
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
    { 
        id: 'q1', 
        label: '1. What is your age?', 
        type: 'select',
        options: [
            { label: 'Under 16', value: 'Under 16' },
            { label: '16-17', value: '16-17' },
            { label: '18+', value: '18+' }
        ]
    },
    { id: 'q2', label: '2. How long active in STB community?', placeholder: 'e.g. 6 months', type: 'text' },
    { id: 'q3', label: '3. What is your time zone?', placeholder: 'e.g. EST, GMT+1', type: 'text' },
    { id: 'q4', label: '4. Languages you read/write?', placeholder: 'e.g. English, Spanish', type: 'text' },
    { 
        id: 'q5', 
        label: '5. Have 2+ Fortnite accounts?', 
        type: 'select',
        options: [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
        ]
    },
    { 
        id: 'q6', 
        label: '6. Can record clips & stay online?', 
        type: 'select',
        options: [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
        ]
    },
    { 
        id: 'q7', 
        label: '7. Weekly availability?', 
        type: 'select',
        options: [
            { label: '3 Hours / week', value: '3 Hours / week' },
            { label: '7-14 Hours / week', value: '7-14 Hours / week' },
            { label: '14+ Hours / week', value: '14+ Hours / week' }
        ]
    },
    { id: 'q8', label: '8. Any history of bans/scams?', placeholder: 'Yes/No (explain if yes)', type: 'text' },
    { id: 'q9', label: '9. Explain history (if applicable)', placeholder: 'Leave blank if No above', required: false, type: 'text' },
    { id: 'q10', label: '10. Any vouches?', placeholder: 'List names/servers or "None"', type: 'text' },
    { id: 'q11', label: '11. Help with other MM services?', placeholder: 'Yes/No', type: 'text' }
];

module.exports = {
    startDMApplication: async (interaction) => {
        const userId = interaction.user.id;
        console.log(`[APP MANAGER] User ${userId} requested to start an application.`);

        // 1. Check for completed applications
        const completed = loadCompletedApps();
        if (completed.includes(userId)) {
            console.log(`[APP MANAGER] User ${userId} already has a completed application.`);
            const completedEmbed = new EmbedBuilder()
                .setTitle('Application Already Submitted')
                .setDescription('❌ You have already submitted an application. You cannot apply more than once.')
                .setColor(0xFF0000);
            
            try {
                return await interaction.reply({ embeds: [completedEmbed], ephemeral: true });
            } catch (e) {
                return;
            }
        }

        // 2. Check for active applications
        const apps = loadApps();
        if (apps[userId]) {
            console.log(`[APP MANAGER] User ${userId} already has an active application.`);
            const progressEmbed = new EmbedBuilder()
                .setTitle('Application Already In Progress')
                .setDescription('⚠️ You already have an application in progress. Please check your DMs to continue or close it first.')
                .setColor(0xFFAA00);
            
            try {
                return await interaction.reply({ embeds: [progressEmbed], ephemeral: true });
            } catch (e) {
                return;
            }
        }

        // 3. Mark as active BEFORE sending DM to prevent race conditions
        apps[userId] = { answers: {}, step: 0, startTime: Date.now(), messageId: null };
        saveApps(apps);
        console.log(`[APP MANAGER] User ${userId} marked as active.`);

        // Send initial DM with start/close buttons
        try {
            const startEmbed = new EmbedBuilder()
                .setTitle('Supreme MM - MM Trainee Application')
                .setDescription('Thank you for your interest in becoming an MM Trainee!\n\nThis application consists of **11 questions** that will be asked one at a time.\n\nPlease answer each question honestly and clearly. You can take your time - there is no rush.\n\n**Click "Start Application" to begin, or "Close Application" to cancel.**')
                .setColor(0x00FF00)
                .setFooter({ text: 'Supreme BOT • FocusedOVP' });

            const startRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_start_mm_app')
                        .setLabel('Start Application')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('stop_mm_app')
                        .setLabel('Close Application')
                        .setStyle(ButtonStyle.Danger)
                );

            const dmChannel = await interaction.user.createDM();
            const dmMessage = await dmChannel.send({ embeds: [startEmbed], components: [startRow] });
            
            // Store the message ID so we can edit it later
            const currentApps = loadApps();
            if (currentApps[userId]) {
                currentApps[userId].messageId = dmMessage.id;
                saveApps(currentApps);
            }

            const confirmEmbed = new EmbedBuilder()
                .setTitle('Check Your DMs!')
                .setDescription('✅ I\'ve sent you a DM to begin your MM Trainee application.\n\nPlease check your direct messages and click the button to start.')
                .setColor(0x00FF00);

            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        } catch (error) {
            // If DM fails, remove from active apps so they can try again
            const currentApps = loadApps();
            delete currentApps[userId];
            saveApps(currentApps);

            console.error('[APP MANAGER] Error sending DM:', error);
            if (error.code === 50007) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Cannot Send DM')
                    .setDescription('❌ I couldn\'t send you a DM. Please make sure your DMs are open and try again.')
                    .setColor(0xFF0000);
                try {
                    if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                } catch (e) {}
            }
        }
    },

    askNextQuestion: async (user, client, currentStep = 0, interaction = null) => {
        const apps = loadApps();
        const userId = user.id;

        if (!apps[userId]) {
            console.log(`[APP MANAGER] No active application found for user ${userId} when asking next question.`);
            return;
        }

        // Update step in memory
        apps[userId].step = currentStep;
        saveApps(apps);

        // If this is the start of the application and we have an interaction, edit the message
        if (currentStep === 0 && interaction) {
            const startedEmbed = new EmbedBuilder()
                .setTitle('Application Started! ✅')
                .setDescription('The application has begun. I will ask you the questions below one by one.')
                .setColor(0x00FF00);
            try {
                await interaction.editReply({ embeds: [startedEmbed], components: [] });
            } catch (e) {}
        }

        if (currentStep >= questions.length) {
            // All questions answered - submit application
            await module.exports.submitApplication(user, client);
            return;
        }

        const question = questions[currentStep];
        const questionEmbed = new EmbedBuilder()
            .setTitle(`Question ${currentStep + 1} of ${questions.length}`)
            .setDescription(`**${question.label}**\n\n${question.type === 'text' ? `*${question.placeholder}*` : '*Select an option from the menu below*'}${question.required === false ? '\n\n*(Optional - type "skip" to skip)*' : ''}`)
            .setColor(0x00AAFF)
            .setFooter({ text: `Progress: ${currentStep + 1}/${questions.length}` });

        const rows = [];

        if (question.type === 'select') {
            const select = new StringSelectMenuBuilder()
                .setCustomId(`mm_app_select_${currentStep}`)
                .setPlaceholder('Choose an option...')
                .addOptions(
                    question.options.map(opt => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(opt.label)
                            .setValue(opt.value)
                    )
                );
            rows.push(new ActionRowBuilder().addComponents(select));
        }

        const stopRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stop_mm_app')
                    .setLabel('Close Application')
                    .setStyle(ButtonStyle.Danger)
            );
        rows.push(stopRow);

        try {
            const dmChannel = await user.createDM();
            await dmChannel.send({ embeds: [questionEmbed], components: rows });
        } catch (error) {
            console.error('[APP MANAGER] Error asking question:', error);
        }
    },

    handleDMResponse: async (message, client) => {
        if (message.author.bot) return;
        if (!message.guild && (message.channel.type === 1 || message.channel.type === 'DM')) {
            const userId = message.author.id;
            const apps = loadApps();

            if (!apps[userId]) return; // No active application

            const currentStep = apps[userId].step;
            
            // Safety check for step index
            if (currentStep < 0 || currentStep >= questions.length) return;

            const question = questions[currentStep];
            
            // If the current question is a select type, we ignore text input unless it's "skip"
            if (question.type === 'select' && message.content.toLowerCase() !== 'skip') {
                const warnEmbed = new EmbedBuilder()
                    .setDescription('⚠️ Please use the selection menu provided to answer this question.')
                    .setColor(0xFFAA00);
                return await message.reply({ embeds: [warnEmbed] });
            }

            const answer = message.content.trim();

            // Handle skip for optional questions
            if (question.required === false && answer.toLowerCase() === 'skip') {
                apps[userId].answers[question.id] = 'N/A';
            } else {
                // If question is required and they type "skip", we might want to warn them
                if (answer.toLowerCase() === 'skip' && question.required !== false) {
                    const warnEmbed = new EmbedBuilder()
                        .setDescription('⚠️ This question is required. Please provide an answer.')
                        .setColor(0xFFAA00);
                    return await message.reply({ embeds: [warnEmbed] });
                }
                apps[userId].answers[question.id] = answer || 'N/A';
            }

            saveApps(apps);

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setDescription('✅ Answer recorded!')
                .setColor(0x00FF00);
            await message.reply({ embeds: [confirmEmbed] });

            // Ask next question
            await module.exports.askNextQuestion(message.author, client, currentStep + 1);
        }
    },

    handleSelectResponse: async (interaction, client) => {
        const userId = interaction.user.id;
        const apps = loadApps();

        if (!apps[userId]) return;

        const currentStep = apps[userId].step;
        const question = questions[currentStep];
        const answer = interaction.values[0];

        apps[userId].answers[question.id] = answer;
        saveApps(apps);

        const confirmEmbed = new EmbedBuilder()
            .setDescription(`✅ Selected: **${answer}**`)
            .setColor(0x00FF00);
        
        try {
            await interaction.update({ embeds: [confirmEmbed], components: [] });
            // Ask next question
            await module.exports.askNextQuestion(interaction.user, client, currentStep + 1);
        } catch (e) {}
    },

    stopApplication: async (interaction) => {
        const userId = interaction.user.id;
        const apps = loadApps();
        
        if (apps[userId]) {
            delete apps[userId];
            saveApps(apps);
            console.log(`[APP MANAGER] User ${userId} application closed.`);
        }

        const stopEmbed = new EmbedBuilder()
            .setTitle('Application Closed 🛑')
            .setDescription('Your application has been closed and all progress has been cleared.')
            .setColor(0xFF0000);

        try {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await interaction.update({ embeds: [stopEmbed], components: [] });
            } else if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [stopEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [stopEmbed] });
            }
        } catch (e) {}
    },

    submitApplication: async (user, client) => {
        const apps = loadApps();
        const userId = user.id;
        
        if (!apps[userId]) return;

        const finalData = apps[userId].answers;

        // Clean up data
        delete apps[userId];
        saveApps(apps);
        saveCompletedApp(userId);
        console.log(`[APP MANAGER] User ${userId} application submitted.`);

        const gifUrl = 'https://share.creavite.co/6973ecb1bab97f02c66bd444.gif';
        const finishEmbed = new EmbedBuilder()
            .setTitle('Application Submitted')
            .setDescription('✅ Your application has been submitted and logged. Our team will review it shortly.\n\nThank you for applying!')
            .setImage(gifUrl)
            .setColor(0x00FF00)
            .setTimestamp();

        try {
            const dmChannel = await user.createDM();
            await dmChannel.send({ embeds: [finishEmbed] });
        } catch (error) {
            console.error('[APP MANAGER] Error sending completion message:', error);
        }

        // Send to log channel
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const now = new Date();
            const formattedDate = now.toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });

            const logEmbed = new EmbedBuilder()
                .setTitle('New MM Application')
                .setThumbnail(user.displayAvatarURL())
                .setColor(0x00AAFF)
                .setDescription(`**Applicant:** <@${userId}> (${userId})\n**Submitted:** ${formattedDate}`)
                .addFields(
                    ...questions.map(q => ({ 
                        name: q.label, 
                        value: finalData[q.id] ? `\`\`\`\n${finalData[q.id]}\n\`\`\`` : '`N/A`' 
                    }))
                );
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mm_app_accept_${userId}`)
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`mm_app_deny_${userId}`)
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                );

            await logChannel.send({ embeds: [logEmbed], components: [row] });
        }
    }
};
