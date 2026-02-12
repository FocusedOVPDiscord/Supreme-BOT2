const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-delete')
        .setDescription('Delete an active giveaway')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the giveaway message to delete')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const giveawayId = `giveaway_${messageId}`;
        
        const participants = storage.get(interaction.guild.id, giveawayId);
        
        if (participants === undefined || participants === null) {
            return interaction.reply({
                content: `❌ No active giveaway found with Message ID: \`${messageId}\``,
                ephemeral: true
            });
        }

        try {
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId).catch(() => null);
            
            if (message) {
                await message.delete();
            }

            // Remove participants from storage
            storage.set(interaction.guild.id, giveawayId, undefined);
            
            // Remove the metadata
            storage.set(interaction.guild.id, `giveaway_meta_${messageId}`, undefined);

            // Remove from all_giveaways tracking array
            const allGiveaways = storage.get(interaction.guild.id, 'all_giveaways') || [];
            const filtered = allGiveaways.filter(id => id !== messageId);
            await storage.set(interaction.guild.id, 'all_giveaways', filtered);

            return interaction.reply({
                content: `✅ Successfully deleted giveaway \`${messageId}\` and removed its data.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error deleting giveaway:', error);
            return interaction.reply({
                content: `❌ Failed to delete giveaway. Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};
