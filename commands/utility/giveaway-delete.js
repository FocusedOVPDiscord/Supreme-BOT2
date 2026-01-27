const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage.js');

/**
 * SUPREME GIVEAWAY DELETE COMMAND
 * - Deletes a running giveaway by message ID
 * - Restricted to Administrators
 */

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
        
        // Check if giveaway exists in storage
        const participants = storage.get(interaction.guild.id, giveawayId);
        
        if (!participants) {
            return interaction.reply({
                content: `\u274C No active giveaway found with Message ID: \`${messageId}\``,
                ephemeral: true
            });
        }

        try {
            // Try to find and delete the message
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId).catch(() => null);
            
            if (message) {
                await message.delete();
            }

            // Remove from storage
            storage.set(interaction.guild.id, giveawayId, undefined);
            
            // Also remove the metadata if it exists
            storage.set(interaction.guild.id, `giveaway_meta_${messageId}`, undefined);

            return interaction.reply({
                content: `\u2705 Successfully deleted giveaway \`${messageId}\` and removed its data.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error deleting giveaway:', error);
            return interaction.reply({
                content: `\u274C Failed to delete giveaway. Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};