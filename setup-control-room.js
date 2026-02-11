const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
const CONTROL_CHANNEL_ID = '1470577900540661925';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        const channel = await client.channels.fetch(CONTROL_CHANNEL_ID);
        if (!channel) {
            console.error('Control channel not found!');
            process.exit(1);
        }

        const controlEmbed = new EmbedBuilder()
            .setTitle('🔊 Supreme Voice Control Room')
            .setDescription('Use the buttons below to manage your temporary voice channel.\n\n' +
                '**How it works:**\n' +
                '1. Join the **Join to Create** channel to get your own room.\n' +
                '2. Use these buttons while you are in **your own** room.\n\n' +
                '**Controls:**\n' +
                '📝 **Rename**: Change your room name\n' +
                '👥 **Limit**: Set user limit (0-99)\n' +
                '🔒 **Lock**: Prevent others from joining\n' +
                '🔓 **Unlock**: Allow everyone to join\n' +
                '👻 **Hide**: Hide channel from everyone\n' +
                '👁️ **Show**: Make channel visible\n' +
                '✅ **Permit**: Allow specific user to join\n' +
                '❌ **Reject**: Block/Kick specific user\n' +
                '👞 **Kick**: Remove user from channel\n' +
                '🔇 **Mute**: Mute a user (via @mention)\n' +
                '🔊 **Unmute**: Unmute a user (via @mention)\n' +
                '👑 **Claim**: Claim an empty room')
            .setColor('#2F3136')
            .setFooter({ text: 'Supreme Voice Control • Persistent Room' })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vc_rename_persistent`).setLabel('Rename').setEmoji('📝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_limit_persistent`).setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_lock_persistent`).setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_unlock_persistent`).setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vc_hide_persistent`).setLabel('Hide').setEmoji('👻').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_show_persistent`).setLabel('Show').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_permit_persistent`).setLabel('Permit').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`vc_reject_persistent`).setLabel('Reject').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vc_kick_persistent`).setLabel('Kick').setEmoji('👞').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`vc_mute_persistent`).setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_unmute_persistent`).setLabel('Unmute').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`vc_claim_persistent`).setLabel('Claim').setEmoji('👑').setStyle(ButtonStyle.Primary)
        );

        await channel.send({
            embeds: [controlEmbed],
            components: [row1, row2, row3]
        });

        console.log('✅ Persistent Control Room panel sent successfully!');
    } catch (error) {
        console.error('Error setting up control room:', error);
    }
    
    process.exit(0);
});

client.login(TOKEN);
