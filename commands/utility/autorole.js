const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage.js'); // Since it's in the same folder as storage.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-role')
        .setDescription('Set a role to be automatically given to new members')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to assign automatically')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Restrict to specific User ID
        if (interaction.user.id !== '982731220913913856') {
            return await interaction.reply({ 
                content: 'You do not have permission to use this command.', 
                ephemeral: true 
            });
        }

        const role = interaction.options.getRole('role');

        if (role.managed) {
            return await interaction.reply({ 
                content: 'I cannot assign a managed role (like a bot role).', 
                ephemeral: true 
            });
        }

        if (interaction.guild.members.me.roles.highest.position <= role.position) {
            return await interaction.reply({ 
                content: 'I cannot assign this role because it is higher than or equal to my highest role!', 
                ephemeral: true 
            });
        }

        const success = storage.set(interaction.guild.id, 'autoRoleId', role.id);

        if (!success) {
            return await interaction.reply({ 
                content: 'Failed to save the auto-role setting. Please check bot permissions!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Auto-Role Set')
            .setDescription(`New members will now automatically receive the ${role} role.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};