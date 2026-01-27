const { Events, REST, Routes, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log('Exclusive Multi-Purpose Bot is online.');

        // Set the Bot Status immediately
        client.user.setActivity('Supreme | Market', { type: ActivityType.Listening });

        // Run background tasks to avoid blocking the ready event
        (async () => {
            console.log('[DEBUG] Starting background initialization tasks...');

            // --- AUTOMATIC RECRUITMENT PANEL ---
            try {
                const RECRUIT_CHANNEL_ID = '1464377545750216714';
                const channel = await client.channels.fetch(RECRUIT_CHANNEL_ID).catch(() => null);
                if (channel) {
                    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
                    const panelExists = messages && messages.some(m => m.embeds.length > 0 && m.embeds[0].title === 'Supreme | MM – MM Trainee Applications');
                    
                    if (!panelExists) {
                        const panelGifUrl = 'https://share.creavite.co/6973ecb1bab97f02c66bd444.gif';
                        const embed = new EmbedBuilder()
                            .setTitle('Supreme | MM – MM Trainee Applications')
                            .setDescription(`Supreme | MM ~by FocuesdOVP is a neutral Middleman & Escrow service for secure, ticket-only trades in the Steal The Brainrot ecosystem and beyond. We are opening applications for our entry-level staff rank: <@&1457664338163667072>\n\nMM Trainee is a learning-focused role in the Supreme | MM and learn the Supreme flow\n• help collect & structure information for the human MM\n• assist with small support tasks in tickets\n• but are never allowed to run trades alone or hold money/items themselves. This is not a clout title. It is for people who seriously want to learn Middleman work and maybe grow into Rookie / Verified MM later.\n\n**Requirements (must all apply)**\n• 16+ and at least 1 month active in the Supreme / STB community\n• no known scam cases, no major drama / toxic behaviour in trading servers\n• neutral behaviour (no favoritism, no ego / drama)\n• stable internet + can use Discord confidently (threads, screenshots, etc.)\n• able to record short clips (gameplay or delivery proof) and upload them to Discord\n• at least 2 usable Fortnite accounts for trade-related tasks\n• can understand and write English clearly\n\n**Role Limits**\nAs an MM Trainee you:\n• never hold money or items yourself\n• never run trades alone – always under supervision of a Rookie / Verified / Senior MM or FocusedOVP\n• do not run your own MM service outside Supreme\n• are never MM in your own trades – only a trader there\n• only work inside official Supreme tickets. The role can be changed or removed at any time if there are doubts about your trust, behaviour, or fit.\n\n**About the Application**\nPlease answer honestly and in English. Low-effort or dishonest applications may be denied.\n\nIf you meet the requirements and want to continue:\nClick the button below to start your MM Trainee application.`)
                            .setColor(0x00FF00)
                            .setFooter({ text: 'Supreme BOT', iconURL: client.user.displayAvatarURL() })
                            .setImage(panelGifUrl);

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('start_mm_app_initial')
                                    .setLabel('MM Application')
                                    .setStyle(ButtonStyle.Success)
                            );

                        await channel.send({ embeds: [embed], components: [row] });
                        console.log('[INFO] Recruitment panel sent to channel.');
                    } else {
                        console.log('[INFO] Recruitment panel already exists. Skipping.');
                    }
                }
            } catch (err) {
                console.error('[ERROR] Failed to process recruitment panel:', err);
            }

            // --- SLASH COMMAND REGISTRATION ---
            try {
                const commands = [];
                const foldersPath = path.join(__dirname, '../commands');
                
                if (fs.existsSync(foldersPath)) {
                    const commandFolders = fs.readdirSync(foldersPath);
                    for (const folder of commandFolders) {
                        const commandsPath = path.join(foldersPath, folder);
                        if (fs.lstatSync(commandsPath).isDirectory()) {
                            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                            for (const file of commandFiles) {
                                const filePath = path.join(commandsPath, file);
                                const command = require(filePath);
                                if ('data' in command && 'execute' in command) {
                                    commands.push(command.data.toJSON());
                                }
                            }
                        }
                    }
                }

                const rest = new REST().setToken(process.env.TOKEN);
                const clientId = process.env.CLIENT_ID || client.user.id;
                
                if (!clientId) {
                    console.error('[ERROR] CLIENT_ID is missing. Cannot register slash commands.');
                } else {
                    console.log(`[INFO] Registering ${commands.length} slash commands for Client ID: ${clientId}`);
                    await rest.put(Routes.applicationCommands(clientId), { body: commands });
                    console.log('[SUCCESS] Slash commands registered successfully!');
                }
            } catch (error) {
                console.error('[ERROR] Failed to register slash commands:', error);
            }
            
            console.log('[DEBUG] Background initialization tasks complete.');
        })();
    },
};