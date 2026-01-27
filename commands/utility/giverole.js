const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-role')
        .setDescription('Give a role to a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to give the role to')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to give (Only roles I can manage are shown)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Changed from ManageRoles to Administrator

    async execute(interaction) {
        const user = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        const botMember = interaction.guild.members.me;

        // Double check permissions in the execute function for extra security
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: 'You must have the **Administrator** permission to use this command!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // Check if the user already has the role
        if (user.roles.cache.has(role.id)) {
            return interaction.reply({ 
                content: `The user ${user} already has the role **${role.name}**!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // Check if the bot can manage this role
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ 
                content: `I cannot give the role **${role.name}** because it is higher than or equal to my highest role!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // Check if the bot has permission to manage roles
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ 
                content: 'I do not have the "Manage Roles" permission to perform this action!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            await user.roles.add(role);

            const successEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Supreme', 
                    iconURL: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp' 
                })
                .setTitle('Role Given')
                .setDescription(`Successfully gave the role ${role} to ${user}.`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `Failed to give role: ${error.message}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};