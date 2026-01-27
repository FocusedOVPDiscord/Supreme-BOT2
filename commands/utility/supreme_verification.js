const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

/**
 * SUPREME MM VERIFICATION SYSTEM (Final Polished Version)
 * - Fixed encoding for © (\u00A9), – (\u2013), and · (\u00B7)
 * - Replaced '-' and '&' in footer with middle dots
 * - Banner GIF and Custom Emoji Button
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploy-rules')
        .setDescription('Deploys the Supreme MM Rules and Verification message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const LOGO_URL = 'https://images-ext-1.discordapp.net/external/aCiECEdiMvNhJHuMZaRCI_eD7MACnR--l7RkryVvJUw/https/files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp';
        const BANNER_GIF = 'https://cdn.discordapp.com/attachments/1458034966465351700/1460429764354379880/banner.gif?ex=6966e2b5&is=69659135&hm=ebb46cbd285138761a9ed4c86bcce0161842b3587af9d0991f5a3100de36ce14&';
        
        const embed = new EmbedBuilder()
            .setTitle('**__Supreme MM Rules & Middleman Policy__**')
            .setDescription('Welcome to **Supreme MM**. Before accessing the full server and using any **Middleman services**, please read and agree to the following rules and policies.')
            .setColor(0x00FF00) // Professional Green
            .addFields(
                { 
                    name: ':one: __**Respect & Behavior**__', 
                    value: '- Keep all communication, especially in **tickets**, clear, respectful and factual.\n- No insults, harassment, drama or personal attacks towards staff or other users.\n- This is not a social or community server - the focus is **secure, structured Middleman and Escrow trades** only.' 
                },
                { 
                    name: ':two: __**No Spam or Self-Promo**__', 
                    value: '- No advertising, self-promotion, or links to other servers.\n- No scam, phishing, referral or suspicious links of any kind.\n- This server exists only for **Supreme MM / Escrow trades** handled through the official ticket system.' 
                },
                { 
                    name: ':three: __**Trade Safety & Responsibility**__', 
                    value: '- **Supreme MM** provides procedural protection only: structured steps, verification and full logs inside the official ticket system.\n- It does not mean insurance, a guarantee of results, or compensation for losses.\n\n**Any trade done in DMs, group chats, or outside Supreme MM tickets is 100% at your own risk.**\n\n**Supreme MM** and its staff are not responsible for:\n- Scams, fraud, chargebacks or disputes between traders.\n- Lost items, accounts, currencies or access details.\n- Technical issues, server outages, or events outside our control.' 
                },
                { 
                    name: ':four: __**Market, Dupes & Game Resets**__', 
                    value: '- **Supreme MM** does not provide market or pricing advice.\n- We are not responsible for:\n  - Dupes, bugs, glitches or exploits used by any party.\n  - Game patches, wipes, bans, or resets by providers.\n  - Value changes of items or accounts after the trade.\n**Every trade is done at your own risk.**' 
                },
                { 
                    name: ':five: __**Staff & Conduct**__', 
                    value: '- In tickets, follow instructions only from **verified Supreme MM staff**.\n- **Supreme staff will never ask for:**\n  - Account passwords\n  - Full email logins\n  - 2FA codes or recovery codes\n- If anyone claiming to be staff asks for these, **stop the trade immediately**.' 
                },
                { 
                    name: ':six: __**Summary \u2013 What Supreme MM is (and is not)**__', 
                    value: '- **Supreme MM** exists only to provide Middleman and Escrow services for digital trades.\n- We are **not** a market analysis service or a general conflict mediator.\n- **Focus:** Secure, verified, transparent MM trades - nothing beyond that.\n- You always carry the **final risk** for your trades, items and accounts.' 
                },
                { 
                    name: ':seven: __**Confirmation \u2013 Access to Trades & Tickets**__', 
                    value: 'By clicking the button below, you confirm that you have **read, understood and agree** to all Supreme MM Rules & Middleman Policy above.\n\nOnly after this confirmation will you receive **full access** to trades, tickets and updates on the official Supreme MM server.' 
                }
            )
            .setImage(BANNER_GIF)
            .setFooter({ 
                text: '\u00A9 Supreme \u00B7 Neutral Middleman \u00B7 Escrow Service', 
                iconURL: LOGO_URL 
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_user')
                    .setLabel('Verify')
                    .setEmoji('1411678367719100438')
                    .setStyle(ButtonStyle.Success),
            );

        await interaction.reply({ content: 'Rules have been deployed publicly to this channel.', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};