const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const storage = require('./storage.js'); // Ensure this path is correct

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Configure the welcome message description and banner (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where welcome messages will be sent')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('banner')
                .setDescription('The URL of the welcome GIF/Image')
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const banner = interaction.options.getString('banner');

        // Store temporary data so we can use it after the modal is submitted
        const tempKey = `temp_welcome_${interaction.user.id}`;
        storage.set(interaction.guild.id, tempKey, {
            channelId: channel.id,
            bannerUrl: banner
        });

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('welcome_setup_modal')
            .setTitle('Welcome Message Setup');

        // Description Input (Paragraph)
        const descInput = new TextInputBuilder()
            .setCustomId('welcome_description')
            .setLabel("Embed Description")
            .setPlaceholder("Step 1 - Read rules...\nStep 2 - Reach out...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(descInput);
        modal.addComponents(firstActionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
    },
};