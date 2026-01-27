const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

/**
 * SUPREME ABOUT COMMAND
 * - Matches the exact layout from the provided image
 * - Supreme branding & FocusedOVP as developer
 * - Real-time uptime calculation
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Display information about Supreme Bot'),
    async execute(interaction) {
        // Calculate Uptime
        let totalSeconds = (interaction.client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`;
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Supreme', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(
                'Supreme is a professional Discord bot designed to provide elite security, ' +
                'seamless ticket management, and advanced utility for your server.'
            )
            .addFields(
                { 
                    name: 'Information', 
                    value: `\u2022 **Developer:** @FocusedOVP\n` +
                           `\u2022 **Uptime:** ${uptimeString}`
                }
            )
            .setFooter({
                text: 'Thank you for using Supreme!',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setColor('#00FFFF') // Matching the cyan/blue color from the image
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};