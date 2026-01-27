const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-tickets')
        .setDescription('Setup the Supreme Middleman ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Supreme', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('💸 Middleman Tickets')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setDescription(
                '📌 **Important**\n' +
                'Only open a ticket when both trading parties have agreed to use a SM MM.\n' +
                'Repeated misuse or spam tickets may lead to temporary or permanent restrictions.\n\n' +
                '⚠️ **Ticket Policy & Requirements**\n' +
                '• SM provides a structured, documented process – not a guarantee, insurance, or refund service.\n' +
                '• All protection applies only to trades handled inside official SM tickets with verified staff.\n' +
                '• Trades in DMs, group chats, or other servers are 100% at your own risk.\n' +
                '• Staff may delay, decline, or cancel any trade that fails verification or looks unsafe.\n' +
                '• Do not send items, accounts, or payments until a SM staff member clearly confirms both sides and tells you when to start.\n\n' +
                '💸 **Here is the SM server\'s official MM tipping policy (Mandatory)**\n' +
                '**Item for Item trades 🏷️:**\n' +
                '• FREE for everyone no matter how big the trade, or how small either.\n' +
                '**Item For Money trades 💸:**\n' +
                '• Tax Included Depends On The Trade'
            )
            .setImage('https://cdn.discordapp.com/attachments/1354437993024454817/1461387048639266899/banner.gif?ex=696a5e3f&is=69690cbf&hm=22f70cf924f406db46371223d79090ddd2750ce45f8dc5002349e098db255a67&')
            .setColor('#00FF00')
            .setFooter({ text: 'Supreme Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_middleman_ticket')
                .setLabel('Create Middleman Ticket')
                .setEmoji('🤝')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: 'The Supreme Middleman panel has been deployed!',
            ephemeral: true
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    },
};