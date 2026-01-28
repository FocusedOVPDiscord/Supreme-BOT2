const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getPath, DATA_DIR } = require('./pathConfig');

const DATA_PATH = getPath('active_apps.json');
const COMPLETED_APPS_PATH = getPath('completed_apps.json');
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
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_PATH, JSON.stringify(apps, null, 2));
    } catch (e) {
        console.error('[APP MANAGER] Error saving application data:', e);
        throw e;
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
        const completed = loadCompletedApps();
        if (completed.includes(userId)) {
            const completedEmbed = new EmbedBuilder()
                .setTitle('Application Already Submitted')
                .setDescription('❌ You have already submitted an application. You cannot apply more than once.')
                .setColor(0xFF0000);
            return await interaction.reply({ embeds: [completedEmbed], ephemeral: true });
        }

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
            let apps = loadApps();
        
            if (!apps[userId]) {
                if (part > 1) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('Application Error')
                        .setDescription('❌ **No application data found.**\n\nPlease start from **Part 1** again.')
                        .setColor(0xFF0000);
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
                apps[userId] = { answers: {}, step: 1 };
            }

            const currentQuestions = part === 1 ? questions.slice(0, 5) : (part === 2 ? questions.slice(5, 10) : questions.slice(10, 11));
            
            for (const q of currentQuestions) {
                const value = interaction.fields.getTextInputValue(q.id);
                apps[userId].answers[q.id] = value;
            }

            if (part < 3) {
                apps[userId].step = part + 1;
                saveApps(apps);
                
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
                await interaction.deferReply({ ephemeral: true });

                const finalData = apps[userId].answers;
                delete apps[userId];
                saveApps(apps);
                saveCompletedApp(userId);

                const gifUrl = 'https://share.creavite.co/6973ecb1bab97f02c66bd444.gif';
                const finishEmbed = new EmbedBuilder()
                    .setTitle('Application Submitted')
                    .setDescription('✅ Your application has been submitted and logged. Our team will review it shortly.')
                    .setImage(gifUrl)
                    .setColor(0x00FF00)
                    .setTimestamp();

                await interaction.editReply({ embeds: [finishEmbed] });

                const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const now = new Date();
                    const formattedDate = now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

                    const logEmbed = new EmbedBuilder()
                        .setTitle('New MM Application')
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .setColor(0x00AAFF)
                        .setDescription(`**Applicant:** <@${interaction.user.id}> (${interaction.user.id})\n**Submitted:** ${formattedDate}`)
                        .addFields(
                            ...questions.map(q => ({ 
                                name: q.label, 
                                value: finalData[q.id] ? `\`\`\`\n${finalData[q.id]}\n\`\`\`` : '`N/A`' 
                            }))
                        );
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`mm_app_accept_${interaction.user.id}`)
                                .setLabel('Accept')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`mm_app_deny_${interaction.user.id}`)
                                .setLabel('Deny')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await logChannel.send({ embeds: [logEmbed], components: [row] });
                }
            }
        } catch (error) {
            console.error('[APP MANAGER] Error in handleModalSubmit:', error);
        }
    }
};
