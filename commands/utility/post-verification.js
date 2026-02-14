const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Specific role IDs to include in verification
const STAFF_ROLE_IDS = [
    '1354402446994309123', // Founder
    '1410661468688482314', // Moderator
    '1457664338163667072', // Senior Middleman
    '1470227366692392960', // Trainee Middleman
    '1467922047148625920'  // Trusted
];

const SERVER_ID = '1354399868851978322';
const INVITE_LINK = 'https://discord.gg/smmp';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post-verification')
        .setDescription('Post/update official Supreme verification embed with staff list')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to post the verification embed (defaults to current channel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            // Get staff custom info from database
            const { query } = require('../../utils/db');
            const staffInfoData = await query(
                'SELECT * FROM staff_info WHERE guild_id = ?',
                [interaction.guild.id]
            );

            const staffInfo = {};
            staffInfoData.forEach(row => {
                staffInfo[row.user_id] = {
                    mainEpic: row.main_epic,
                    additionalMM: row.additional_mm,
                    customNotes: row.custom_notes
                };
            });

            // Build the embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Supreme Officials')
                .setDescription(
                    `Welcome to the **only official verification hub** of Supreme MM.\n` +
                    `Before you trust any server, account, or "Supreme / SMMP" tag, always check this message first.\n\n` +
                    `The "Supreme / SMMP" tag is public – anyone can use it.\n` +
                    `Having "Supreme", "SMMP" or similar in a name or status does not make a user trusted or staff.\n` +
                    `Only what is listed in this embed is considered official.`
                )
                .setTimestamp()
                .setFooter({ text: 'Supreme MM Verification System' });

            // Add server info
            embed.addFields({
                name: '🌐 Official Supreme MM Server',
                value: 
                    `**Official Supreme Invite:** ${INVITE_LINK}\n` +
                    `**Official Supreme MM Server ID:** ${SERVER_ID}\n` +
                    `All official Middleman cases are handled **exclusively** on this server,\n` +
                    `with verified Supreme MM staff and through the official ticket system.`,
                inline: false
            });

            // Fetch all members
            await interaction.guild.members.fetch();

            // Get roles and filter by specific IDs
            const staffRoles = STAFF_ROLE_IDS
                .map(roleId => interaction.guild.roles.cache.get(roleId))
                .filter(role => role !== undefined)
                .sort((a, b) => b.position - a.position);

            // Group members by role
            let fieldCount = 1;
            for (const role of staffRoles) {
                if (fieldCount >= 25) break;

                const members = role.members
                    .filter(member => !member.user.bot)
                    .sort((a, b) => a.user.username.localeCompare(b.user.username));

                if (members.size === 0) continue;

                const roleEmoji = this.getRoleEmoji(role.name);
                let memberList = '';

                for (const member of members.values()) {
                    const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
                    const info = staffInfo[member.user.id] || {};
                    
                    let memberInfo = 
                        `**Name:** ${member.user.tag}\n` +
                        `**User ID:** ${member.user.id}\n` +
                        `**Account created:** ${accountCreated}\n` +
                        `**Role:** ${role}`;
                    
                    if (info.mainEpic) {
                        memberInfo += `\n**Main Epic:** ${info.mainEpic}`;
                    }
                    if (info.additionalMM) {
                        memberInfo += `\n**Additional MM:** ${info.additionalMM}`;
                    }
                    
                    memberInfo += '\n\n';

                    if ((memberList + memberInfo).length > 1024) {
                        break;
                    }

                    memberList += memberInfo;
                }

                if (memberList) {
                    embed.addFields({
                        name: `${roleEmoji} ${role.name} – ${members.size}`,
                        value: memberList || '...',
                        inline: false
                    });
                    fieldCount++;
                }
            }

            // Check if there's an existing embed to update
            const existingEmbeds = await query(
                'SELECT * FROM staff_embeds WHERE guild_id = ? AND channel_id = ? ORDER BY created_at DESC LIMIT 1',
                [interaction.guild.id, targetChannel.id]
            );

            let sentMessage;
            if (existingEmbeds.length > 0) {
                // Try to update existing message
                try {
                    const existingMessage = await targetChannel.messages.fetch(existingEmbeds[0].message_id);
                    sentMessage = await existingMessage.edit({ embeds: [embed] });
                    await interaction.editReply({
                        content: `✅ Verification embed updated successfully in ${targetChannel}!`,
                        ephemeral: true
                    });
                } catch (err) {
                    // If message not found, create new one
                    sentMessage = await targetChannel.send({ embeds: [embed] });
                    await query(
                        'UPDATE staff_embeds SET message_id = ?, created_at = ? WHERE guild_id = ? AND channel_id = ?',
                        [sentMessage.id, Date.now(), interaction.guild.id, targetChannel.id]
                    );
                    await interaction.editReply({
                        content: `✅ Verification embed posted successfully to ${targetChannel}!`,
                        ephemeral: true
                    });
                }
            } else {
                // Create new embed
                sentMessage = await targetChannel.send({ embeds: [embed] });
                
                // Save embed info to database
                await query(
                    `INSERT INTO staff_embeds (guild_id, channel_id, message_id, created_at) 
                     VALUES (?, ?, ?, ?)`,
                    [interaction.guild.id, targetChannel.id, sentMessage.id, Date.now()]
                );

                await interaction.editReply({
                    content: `✅ Verification embed posted successfully to ${targetChannel}!`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error posting verification embed:', error);
            const errorMessage = interaction.deferred 
                ? { content: '❌ Failed to post verification embed. Please try again.', ephemeral: true }
                : '❌ Failed to post verification embed. Please try again.';
            
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    getRoleEmoji(roleName) {
        const emojiMap = {
            'owner': '👑',
            'founder': '👑',
            'admin': '⚡',
            'administrator': '⚡',
            'manager': '☎️',
            'mod': '🛡️',
            'moderator': '🛡️',
            'helper': '💚',
            'support': '💙',
            'staff': '⭐',
            'developer': '💻',
            'dev': '💻',
            'vip': '💎',
            'premium': '✨',
            'member': '👤',
            'verified': '✅',
            'trusted': '🔰',
            'elite': '💣',
            'master': '⚜️',
            'senior': '🧿',
            'advanced': '🌻',
            'mentor': '🌸',
            'rookie': '💠',
            'junior': '🌿',
            'trainee': '🔰',
            'apprentice': '🪸',
            'retired': '🛠️',
            'godlike': '⚝',
            'lead': '🫟',
            'middleman': '🤝'
        };

        const lowerName = roleName.toLowerCase();
        for (const [keyword, emoji] of Object.entries(emojiMap)) {
            if (lowerName.includes(keyword)) {
                return emoji;
            }
        }

        return '📌';
    }
};
