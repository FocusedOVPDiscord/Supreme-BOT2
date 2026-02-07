const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { query } = require('./utils/db');

const LOG_CHANNEL_ID = '1464393139417645203';

// In-memory cache for active applications (not submitted yet)
// We keep this in memory as it's transient, but once submitted, it goes to TiDB
const activeAppsCache = new Map();

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
    async isAlreadyApplied(userId) {
        try {
            const results = await query('SELECT 1 FROM applications WHERE user_id = ?', [userId]);
            return results.length > 0;
        } catch (error) {
            console.error('[APP MANAGER] Error checking application status:', error);
            return false;
        }
    },

    startDMApplication: async (interaction) => {
        const userId = interaction.user.id;
        console.log(`[APP MANAGER] User ${userId} starting application.`);

        const applied = await module.exports.isAlreadyApplied(userId);
        if (applied) {
            const completedEmbed = new EmbedBuilder()
                .setTitle('Application Already Submitted')
                .setDescription('❌ You have already submitted an application.')
                .setColor(0xFF0000);
            return await interaction.reply({ embeds: [completedEmbed], ephemeral: true }).catch(() => null);
        }

        if (activeAppsCache.has(userId)) {
            const progressEmbed = new EmbedBuilder()
                .setTitle('Application Already In Progress')
                .setDescription('⚠️ Check your DMs or close the current one first.')
                .setColor(0xFFAA00);
            return await interaction.reply({ embeds: [progressEmbed], ephemeral: true }).catch(() => null);
        }

        activeAppsCache.set(userId, { answers: {}, step: 0, startTime: Date.now(), messageId: null });

        try {
            const startEmbed = new EmbedBuilder()
                .setTitle('Supreme MM - MM Trainee Application')
                .setDescription('This application consists of **11 questions**.\n\n**Click "Start Application" to begin.**')
                .setColor(0x00FF00);

            const startRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_start_mm_app').setLabel('Start Application').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('stop_mm_app').setLabel('Close Application').setStyle(ButtonStyle.Danger)
            );

            const dmChannel = await interaction.user.createDM();
            const dmMessage = await dmChannel.send({ embeds: [startEmbed], components: [startRow] });
            
            if (activeAppsCache.has(userId)) {
                activeAppsCache.get(userId).messageId = dmMessage.id;
            }

            await interaction.reply({ content: '✅ Check your DMs!', ephemeral: true }).catch(() => null);
        } catch (error) {
            activeAppsCache.delete(userId);
            console.error('[APP MANAGER] DM Error:', error.message);
            await interaction.reply({ content: '❌ Could not send DM. Please open your DMs.', ephemeral: true }).catch(() => null);
        }
    },

    askNextQuestion: async (user, client, currentStep = 0, interaction = null) => {
        const userId = user.id;
        const app = activeAppsCache.get(userId);
        if (!app) return;

        app.step = currentStep;

        if (currentStep === 0 && interaction) {
            try { 
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Application Started! ✅', embeds: [], components: [] }); 
                }
            } catch (e) {
                console.warn('[APP MANAGER] Could not edit start message:', e.message);
            }
        }

        if (currentStep >= questions.length) {
            return await module.exports.submitApplication(user, client);
        }

        const question = questions[currentStep];
        const questionEmbed = new EmbedBuilder()
            .setTitle(`Question ${currentStep + 1} of ${questions.length}`)
            .setDescription(`**${question.label}**\n\n${question.type === 'text' ? `*${question.placeholder}*` : '*Select an option*'}`)
            .setColor(0x00AAFF);

        const rows = [];
        if (question.type === 'select') {
            const select = new StringSelectMenuBuilder()
                .setCustomId(`mm_app_select_${currentStep}`)
                .setPlaceholder('Choose an option...')
                .addOptions(question.options.map(opt => new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value)));
            rows.push(new ActionRowBuilder().addComponents(select));
        }
        rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('stop_mm_app').setLabel('Close Application').setStyle(ButtonStyle.Danger)));

        try {
            const dmChannel = await user.createDM();
            await dmChannel.send({ embeds: [questionEmbed], components: rows });
        } catch (error) {
            console.error('[APP MANAGER] Question Error:', error.message);
        }
    },

    handleDMResponse: async (message, client) => {
        if (message.author.bot || message.guild) return;
        const userId = message.author.id;
        const app = activeAppsCache.get(userId);
        if (!app) return;

        const currentStep = app.step;
        if (currentStep < 0 || currentStep >= questions.length) return;

        const question = questions[currentStep];
        if (question.type === 'select') return;

        app.answers[question.id] = message.content.trim() || 'N/A';

        await message.reply({ content: '✅ Recorded!' }).catch(() => null);
        await module.exports.askNextQuestion(message.author, client, currentStep + 1);
    },

    handleSelectResponse: async (interaction, client) => {
        const userId = interaction.user.id;
        const app = activeAppsCache.get(userId);
        if (!app) return;

        const currentStep = app.step;
        const question = questions[currentStep];
        
        // Prevent duplicate processing
        if (app.step !== currentStep) return;

        app.answers[question.id] = interaction.values[0];

        try {
            await interaction.update({ content: `✅ Selected: **${interaction.values[0]}**`, embeds: [], components: [] });
            await module.exports.askNextQuestion(interaction.user, client, currentStep + 1);
        } catch (e) {
            if (e.code === 10062 || e.code === 40060) return;
            console.error('[APP MANAGER] Select Error:', e.message);
        }
    },

    stopApplication: async (interaction) => {
        const userId = interaction.user.id;
        activeAppsCache.delete(userId);
        try {
            const stopEmbed = new EmbedBuilder().setTitle('Application Closed 🛑').setColor(0xFF0000);
            if (interaction.isButton() || interaction.isStringSelectMenu()) await interaction.update({ embeds: [stopEmbed], components: [] });
            else await interaction.reply({ embeds: [stopEmbed], ephemeral: true });
        } catch (e) {}
    },

    submitApplication: async (user, client) => {
        const userId = user.id;
        const app = activeAppsCache.get(userId);
        if (!app) return;

        const finalData = app.answers;
        activeAppsCache.delete(userId);

        try {
            // Save to TiDB
            await query(
                'INSERT INTO applications (user_id, status, submitted_at, answers) VALUES (?, ?, ?, ?)',
                [userId, 'pending', Date.now(), JSON.stringify(finalData)]
            );
        } catch (error) {
            console.error('[APP MANAGER] Error saving application to TiDB:', error);
        }

        try {
            const dmChannel = await user.createDM();
            await dmChannel.send({ content: '✅ **Application Submitted!** Our team will review it shortly.' });
        } catch (e) {}

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('New MM Application')
                .setColor(0x00AAFF)
                .setDescription(`**Applicant:** <@${userId}>\n**ID:** ${userId}`)
                .addFields(questions.map(q => ({ name: q.label, value: `\`\`\`\n${finalData[q.id] || 'N/A'}\n\`\`\`` })));
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`mm_app_accept_${userId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`mm_app_deny_${userId}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
            );
            await logChannel.send({ embeds: [logEmbed], components: [row] });
        }
    }
};
