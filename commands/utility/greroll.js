const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('Reroll the winner(s) of a giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the giveaway message to reroll').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('The number of winners to reroll (default: 1)').setRequired(false)),

    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const winnersCount = interaction.options.getInteger('winners') || 1;
        const giveawayId = `giveaway_${messageId}`;

        // Fetch the message to check if it has ended
        let message;
        try {
            message = await interaction.channel.messages.fetch(messageId);
        } catch (e) {
            return interaction.reply({ 
                content: '\u274C Could not find the giveaway message. Make sure you are in the same channel as the giveaway.', 
                ephemeral: true 
            });
        }

        // Check if the giveaway has ended by looking at the buttons
        // Active giveaways have buttons, ended ones have components removed
        if (message.components.length > 0) {
            return interaction.reply({ 
                content: '\u26A0\uFE0F This giveaway is still active! You can only reroll giveaways that have already ended.', 
                ephemeral: true 
            });
        }

        // Get participants from storage
        const participants = storage.get(interaction.guild.id, giveawayId);

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return interaction.reply({ 
                content: '\u274C Could not find any participants for this giveaway ID.', 
                ephemeral: true 
            });
        }

        // Randomly select new winners
        const shuffled = participants.sort(() => 0.5 - Math.random());
        const winners = shuffled.slice(0, winnersCount);
        
        const winnersText = winners.map(id => `<@${id}>`).join(', ');
        
        // Encoded emojis: \u{1F389} is ??, \u2705 is ?
        const partyEmoji = '\u{1F389}';
        const checkEmoji = '\u2705';

        try {
            let prize = 'the giveaway';
            if (message.embeds[0]) {
                prize = `**${message.embeds[0].title}**`;
            }

            await interaction.reply({ content: `${checkEmoji} Successfully rerolled the giveaway!`, ephemeral: true });
            await interaction.channel.send(`${partyEmoji} New winner(s) for ${prize}: ${winnersText}! Congratulations!`);
            
        } catch (error) {
            console.error('Reroll Error:', error);
            await interaction.reply({ content: '\u274C An error occurred while trying to reroll.', ephemeral: true });
        }
    }
};