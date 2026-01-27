const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const persistence = require('../../persistenceManager');
const inviteManager = require('../../inviteManager');
const storage = require('./storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('data-status')
        .setDescription('Check the status of persistent data storage (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guildId = interaction.guild.id;

            // Get invite data
            const allInvites = inviteManager.getAllInvites(guildId);
            const inviteCount = Object.keys(allInvites).length;
            const totalInvites = Object.values(allInvites).reduce((sum, data) => {
                return sum + (data.regular || 0) + (data.bonus || 0);
            }, 0);

            // Get settings data
            const allSettings = storage.getAll(guildId);
            const settingsCount = Object.keys(allSettings).length;

            // Check for welcome config
            const welcomeConfig = storage.get(guildId, 'welcome_config');
            const hasWelcome = welcomeConfig !== null;

            // Check for auto-role
            const autoRoleId = storage.get(guildId, 'autoRoleId');
            const hasAutoRole = autoRoleId !== null;

            // Get invite config
            const inviteConfig = inviteManager.getConfig();

            // Build status embed
            const statusEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📊 Persistent Data Status')
                .setDescription('Current status of all persistent data for this server')
                .addFields(
                    {
                        name: '📨 Invite Tracking',
                        value: `**Users Tracked:** ${inviteCount}\n**Total Invites:** ${totalInvites}\n**Status:** ${inviteCount > 0 ? '✅ Active' : '⚠️ No data'}`,
                        inline: true
                    },
                    {
                        name: '⚙️ Server Settings',
                        value: `**Settings Stored:** ${settingsCount}\n**Welcome Message:** ${hasWelcome ? '✅ Configured' : '❌ Not set'}\n**Auto-Role:** ${hasAutoRole ? '✅ Configured' : '❌ Not set'}`,
                        inline: true
                    },
                    {
                        name: '🔧 Invite Config',
                        value: `**Fake Account Age:** ${inviteConfig.fakeAccountAgeHours}h\n**Auto-Farm Window:** ${inviteConfig.autoFarmWindowMinutes}m\n**Require Avatar:** ${inviteConfig.requireAvatar ? '✅ Yes' : '❌ No'}`,
                        inline: true
                    },
                    {
                        name: '💾 Persistence Status',
                        value: '✅ All data is automatically saved to disk\n✅ Data survives bot restarts\n✅ Automatic backups enabled',
                        inline: false
                    }
                )
                .setFooter({ text: 'All data is stored persistently and will survive restarts' })
                .setTimestamp();

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('[DATA STATUS] Error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while checking data status.' 
            });
        }
    },
};
