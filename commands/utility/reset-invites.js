const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-invites')
        .setDescription('Resets all invite statistics for the entire server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            
            // Get current data before reset
            const allInvites = inviteManager.getAllInvites(guildId);
            const userCount = Object.keys(allInvites).length;
            
            if (userCount === 0) {
                return await interaction.reply({ 
                    content: '⚠️ No invite data found to reset.', 
                    ephemeral: true 
                });
            }
            
            // Reset all invites (this is now persistent)
            const success = inviteManager.resetAll(guildId);
            
            if (!success) {
                return await interaction.reply({ 
                    content: '❌ Failed to reset invites. Please try again.', 
                    ephemeral: true 
                });
            }

            const resetEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ Invites Reset Successfully')
                .setDescription(
                    'All invite statistics have been **permanently cleared** for this server.\n\n' +
                    `**Users Affected:** ${userCount}\n` +
                    '**Status:** Data has been cleared and saved to disk\n' +
                    '**Persistence:** This change will survive bot restarts\n\n' +
                    '💡 A backup was created before clearing the data.'
                )
                .setFooter({ text: 'Invite tracking will continue for new joins' })
                .setTimestamp();

            await interaction.reply({ embeds: [resetEmbed] });
            console.log(`[RESET INVITES] Successfully reset ${userCount} users for guild ${guildId}`);
            
        } catch (error) {
            console.error('[RESET INVITES] Error:', error);
            await interaction.reply({ 
                content: '❌ There was an error trying to reset the invites.', 
                ephemeral: true 
            });
        }
    },
};
