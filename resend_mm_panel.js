const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    const channelId = '1464377545750216714';
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
        console.error('Channel not found!');
        process.exit(1);
    }
    
    const recruitmentEmbed = new EmbedBuilder()
        .setTitle('Supreme MM – MM Trainee Applications')
        .setDescription(`Supreme | MM ~by **FocusedOVP** is a neutral Middleman & Escrow service for secure, ticket-only trades in the Steal The Brainrot ecosystem and beyond. We are opening applications for our entry-level staff rank: <@&1457664338163667072>

MM Trainee is a learning-focused role in the Supreme | MM and learn the **Supreme** flow:
• help collect & structure information for the human MM
• assist with small support tasks in tickets
• but are never allowed to run trades alone or hold money/items themselves.

This is not a clout title. It is for people who seriously want to learn Middleman work and maybe grow into Rookie / Verified MM later.

**Requirements (must all apply)**
• 16+ and at least 1 month active in the **Supreme** / STB community
• no known scam cases, no major drama / toxic behaviour in trading servers
• neutral behaviour (no favoritism, no ego / drama)
• stable internet + can use Discord confidently (threads, screenshots, etc.)
• able to record short clips (gameplay or delivery proof) and upload them to Discord
• at least 2 usable Fortnite accounts for trade-related tasks
• can understand and write English clearly

**Role Limits**
As an MM Trainee you:
• never hold money or items yourself
• never run trades alone – always under supervision of a Rookie / Verified / Senior MM or **FocusedOVP**
• do not run your own MM service outside **Supreme**
• are never MM in your own trades – only a trader there
• only work inside official **Supreme** tickets.

The role can be changed or removed at any time if there are doubts about your trust, behaviour, or fit.

**About the Application**
Please answer honestly and in English. Low-effort or dishonest applications may be denied.

If you meet the requirements and want to continue:
Click the button below to start your MM Trainee application.`)
        .setColor(0x00FF00)
        .setImage('https://share.creavite.co/6973ecb1bab97f02c66bd444.gif')
        .setFooter({ 
            text: 'Supreme BOT • FocusedOVP', 
            iconURL: client.user.displayAvatarURL() 
        });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_mm_app_initial')
                .setLabel('MM Application')
                .setStyle(ButtonStyle.Success)
        );

    try {
        await channel.send({ embeds: [recruitmentEmbed], components: [row] });
        console.log('✅ MM Application panel sent successfully to channel:', channelId);
    } catch (error) {
        console.error('Error sending message:', error);
    }
    
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
