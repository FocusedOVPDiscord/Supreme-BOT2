const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const persistence = require('../../persistenceManager');
const inviteManager = require('../../inviteManager');
const storage = require('./storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup-data')
        .setDescription('Create a manual backup of all server data (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildId = interaction.guild.id;

            // Create full backup
            const backupDir = persistence.backupAll();

            if (!backupDir) {
                return await interaction.editReply({ 
                    content: '❌ Failed to create backup. Check bot logs for details.' 
                });
            }

            // Export guild-specific data
            const inviteData = inviteManager.exportGuildData(guildId);
            const settingsData = storage.export(guildId);

            // Count data
            const inviteCount = Object.keys(inviteData.invites).length;
            const settingsCount = Object.keys(settingsData.settings).length;

            const backupEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Backup Created Successfully')
                .setDescription('A full backup of all bot data has been created.')
                .addFields(
                    {
                        name: '📊 Backup Contents',
                        value: `**Invite Users:** ${inviteCount}\n**Settings:** ${settingsCount}\n**Timestamp:** ${new Date().toLocaleString()}`,
                        inline: false
                    },
                    {
                        name: '📁 Backup Location',
                        value: `\`${backupDir}\``,
                        inline: false
                    },
                    {
                        name: '💡 Info',
                        value: 'Backups are also created automatically:\n• On bot startup\n• Before data modifications\n• Before reset operations',
                        inline: false
                    }
                )
                .setFooter({ text: 'Keep backups safe for data recovery' })
                .setTimestamp();

            await interaction.editReply({ embeds: [backupEmbed] });

        } catch (error) {
            console.error('[BACKUP] Error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while creating backup.' 
            });
        }
    },
};
