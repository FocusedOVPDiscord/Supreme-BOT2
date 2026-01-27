const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

/**
 * SUPREME MM INFORMATION SYSTEM
 * - Restricted to Administrators only
 * - Fixed encoding for all special characters
 * - Uses Unicode escape sequences for 100% reliability
 * - Updated footer with encoded middle dots (\u00B7)
 * - Set to ephemeral response
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-middleman-info')
        .setDescription('Send the Middleman information embed to the info channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Restrict to Administrators only
    async execute(interaction) {
        // Channel ID where the message will be sent
        const channelId = '1458904774714855564';
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: `\u274C Could not find text channel with ID: ${channelId}`,
                ephemeral: true
            });
        }

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('<a:emoji_14:1410652748495589569> __What Is a Middleman (MM)?__')
            .setDescription(
                'A **Middleman (MM)** is a **trusted third party** who helps make trades between two people **safe**, **fair** and **structured**.\n' +
                'Instead of sending items or money directly to each other \u2013 which can easily lead to **scams** \u2013\n' +
                'both traders use the **MM** as a **neutral, verified holder** until the deal is complete.\n\n' +
                'A **Supreme MM** is a **Middleman** that works only through the **official ticket system** on the **official Supreme MM server**, with every step **logged** and **transparent**.'
            )
            .addFields(
                {
                    name: '<a:emoji_14:1410652748495589569> __The Purpose of a Middleman__',
                    value: 'Online trading is full of **risks** \u2014 **fake proofs**, **impersonators**, **rushed deals** and "**too good to be true**" offers.\n' +
                           'The **Middleman\'s job** is to reduce that **risk** as much as possible by:\n\n' +
                           '\u2022 Staying **completely neutral** \u2014 no side advantage.\n' +
                           '\u2022 **Protecting both traders** equally.\n' +
                           '\u2022 Making sure every step of the trade is **clear**, **documented** and **verified**.\n' +
                           '\u2022 Ensuring that **items and payments** are only released when **both sides** have fulfilled their part of the deal.\n' +
                           '\u2022 Using a **ticket-only process** so everything can be **reviewed** later if something goes wrong.\n\n' +
                           'A **Supreme MM** does not decide if your deal is "**good**" or "**bad**" \u2013\n' +
                           'they make sure the **trade** that you agreed to is handled as **safely** and **transparently** as possible.'
                },
                {
                    name: '<a:emoji_14:1410652748495589569> __Why It\'s Important__',
                    value: 'When you trade directly with someone online, you are **trusting them blindly**.\n' +
                           'You often do not know who they **really are**, what **accounts** they control, or what their **history** is.\n\n' +
                           'A **verified Supreme MM** reduces that **risk** because:\n\n' +
                           '\u2022 The **MM** is **known**, **verified** and **documented** on the **official Supreme MM server**.\n' +
                           '\u2022 Every trade runs through **official Supreme MM tickets**, not **DMs** or **random servers**.\n' +
                           '\u2022 Each step is **confirmed publicly and securely**, with **clear logs** for both sides.\n' +
                           '\u2022 You always know who is **holding** the **items and payments**, and under which conditions they will be **released**.'
                },
                {
                    name: '<a:emoji_14:1410652748495589569> __Stay Aware__',
                    value: '**Fake "middlemen"** exist everywhere \u2014 **stay alert**.\n\n' +
                           '\u2022 **Never trust random DMs** offering **MM services**, even if they use "**Supreme**", "**SMM**" or similar tags.\n' +
                           '\u2022 Always **confirm** you are on the **official Supreme MM server** using the **official invite**.\n' +
                           '\u2022 Check the **#SupremeOfficials** channel to **verify real Supreme MM staff** and **official MM accounts** before trading.\n' +
                           '\u2022 For **real scam examples** and patterns, read the posts in the **Anti-Scam Center** before you trade.\n\n' +
                           'If an **account or server** is not listed in the **official Supreme verification channels**, treat it as **unverified** or **high risk**.'
                },
                {
                    name: '<a:emoji_14:1410652748495589569> __In Simple Terms__',
                    value: 'A **Middleman** is the **bridge of trust** between two traders.\n\n' +
                           '\u2022 **No random DMs**, **no guessing**, **less chaos** \u2014 just **structure**, **security** and **transparency**.\n' +
                           '\u2022 A **verified Supreme MM** plus the **official ticket system** gives your trades a **clear framework** and makes it much harder for **scammers** to abuse you.'
                }
            )
            .setFooter({
                text: '\u00A9 Supreme \u00B7 Established by FocusedOVP \u00B7 Neutral Middleman',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setColor('#5865F2')
            .setTimestamp();

        try {
            // Send the embed to the channel
            await channel.send({ embeds: [embed] });
            await interaction.reply({
                content: `\u2705 Middleman info embed sent to <#${channelId}>`,
                ephemeral: true
            });
        } catch (error) {
            console.error(`\u274C Failed to send embed:`, error);
            await interaction.reply({
                content: `\u274C Failed to send the embed. Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};