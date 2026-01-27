const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('member-add')
        .setDescription('Add a member to the current ticket')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to add to the ticket')
                .setRequired(true)),
    
    async execute(interaction) {
        const ALLOWED_ROLE_ID = '1457664338163667072';

        // Check if the user has the required role
        if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
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

        const userToAdd = interaction.options.getUser('user');
        const channel = interaction.channel;

        // --- DUPLICATE CHECK LOGIC ---
        const existingOverwrite = channel.permissionOverwrites.cache.get(userToAdd.id);
        if (existingOverwrite && existingOverwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ 
                content: `${userToAdd} is already in this ticket!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            // Update channel permissions to allow the user to see and send messages
            await channel.permissionOverwrites.edit(userToAdd.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const addEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Supreme', 
                    iconURL: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp' 
                })
                .setTitle('Member Added')
                .setDescription(`${userToAdd} has been added to this ticket by ${interaction.user}.`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [addEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `Failed to add member: ${error.message}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};