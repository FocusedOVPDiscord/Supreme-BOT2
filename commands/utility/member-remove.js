const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('member-remove')
        .setDescription('Remove a member from the current ticket')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove from the ticket')
                .setRequired(true)),
    
    async execute(interaction) {
        const ALLOWED_ROLE_IDS = ['1354402446994309123', '1457664338163667072'];

        // Check if the user has one of the required roles
        const hasPermission = interaction.member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
        
        if (!hasPermission) {
            return interaction.reply({ 
                content: 'You do not have the required role to use this command!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // Check if the command is used in a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ 
                content: 'This command can only be used inside a ticket channel!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const userToRemove = interaction.options.getUser('user');
        const channel = interaction.channel;

        // --- CHECK IF USER IS ALREADY REMOVED ---
        const existingOverwrite = channel.permissionOverwrites.cache.get(userToRemove.id);
        
        // If there's no overwrite, or the ViewChannel permission is already denied/null
        if (!existingOverwrite || !existingOverwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ 
                content: `${userToRemove} is not in this ticket!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            // Remove the user's permission overwrites for this channel
            await channel.permissionOverwrites.delete(userToRemove.id);

            const removeEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Supreme', 
                    iconURL: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp' 
                })
                .setTitle('Member Removed')
                .setDescription(`${userToRemove} has been removed from this ticket by ${interaction.user}.`)
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.reply({ embeds: [removeEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `Failed to remove member: ${error.message}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};