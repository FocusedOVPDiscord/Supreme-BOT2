const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const ai = require('../utils/ai');

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check bot and AI status'),
        async execute(interaction) {
            const stats = db.getStats();
            const aiReady = await ai.checkHealth();
            
            const embed = new EmbedBuilder()
                .setTitle('🤖 Supreme AI Status')
                .setColor(aiReady ? 0x00ff00 : 0xff0000)
                .addFields(
                    { name: 'Groq AI', value: aiReady ? '✓ Online' : '✗ Offline', inline: true },
                    { name: 'Training Entries', value: stats.trainingCount.toString(), inline: true },
                    { name: 'Open Tickets', value: stats.ticketCount.toString(), inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('train')
            .setDescription('Training commands')
            .addSubcommand(sub => 
                sub.setName('add')
                    .setDescription('Add training data')
                    .addStringOption(opt => opt.setName('question').setDescription('The question').setRequired(true))
                    .addStringOption(opt => opt.setName('answer').setDescription('The answer').setRequired(true))
                    .addStringOption(opt => opt.setName('category').setDescription('Category').setRequired(false))
            )
            .addSubcommand(sub => 
                sub.setName('list')
                    .setDescription('List training data')
            )
            .addSubcommand(sub => 
                sub.setName('delete')
                    .setDescription('Delete training data')
                    .addIntegerOption(opt => opt.setName('id').setDescription('The ID to delete').setRequired(true))
            ),
        async execute(interaction) {
            const sub = interaction.options.getSubcommand();
            
            if (sub === 'add') {
                const q = interaction.options.getString('question');
                const a = interaction.options.getString('answer');
                const cat = interaction.options.getString('category') || 'general';
                
                db.addTraining(q, a, cat);
                await interaction.reply(`✅ Added training for: **${q}**`);
            } else if (sub === 'list') {
                const data = db.getAllTraining();
                if (data.length === 0) return interaction.reply('📚 No training data found.');
                
                const embed = new EmbedBuilder()
                    .setTitle('📚 Training Data')
                    .setColor(0x3498db)
                    .setDescription(data.slice(0, 10).map(i => `**${i.id}.** Q: ${i.query.substring(0, 30)}...`).join('\n'));
                
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'delete') {
                const id = interaction.options.getInteger('id');
                db.deleteTraining(id);
                await interaction.reply(`✅ Deleted training entry **#${id}**`);
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Ticket management')
            .addSubcommand(sub => 
                sub.setName('close')
                    .setDescription('Close a ticket')
                    .addStringOption(opt => opt.setName('id').setDescription('Ticket ID (e.g. 0001)').setRequired(true))
            ),
        async execute(interaction) {
            const id = interaction.options.getString('id');
            const ticketId = `ticket-${id.padStart(4, '0')}`;
            db.updateTicketStatus(ticketId, 'closed');
            await interaction.reply(`✅ Ticket **${ticketId}** closed.`);
        }
    }
];

module.exports = commands;
