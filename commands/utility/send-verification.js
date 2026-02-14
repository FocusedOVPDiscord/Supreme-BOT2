const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-verification')
        .setDescription('Send official server verification and staff list embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the verification embed (defaults to current channel)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Custom title for the embed (default: "Server Officials")')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Custom description/welcome message')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('server_info')
                .setDescription('Additional server information (invite link, server ID, etc.)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const customTitle = interaction.options.getString('title') || 'Server Officials';
            const customDescription = interaction.options.getString('description') || 
                `Welcome to the **only official verification hub** of ${interaction.guild.name}.\n` +
                `Before you trust any server, account, or tag, always check this message first.\n\n` +
                `Only what is listed in this embed is considered official.`;
            const serverInfo = interaction.options.getString('server_info');

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
                .setTitle(`✅ ${customTitle}`)
                .setDescription(customDescription)
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Verification System` });

            // Add server info if provided
            if (serverInfo) {
                embed.addFields({
                    name: '🌐 Official Server Information',
                    value: serverInfo,
                    inline: false
                });
            } else {
                // Default server info
                embed.addFields({
                    name: '🌐 Official Server Information',
                    value: `**Server Name:** ${interaction.guild.name}\n` +
                           `**Server ID:** ${interaction.guild.id}\n` +
                           `**Created:** <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:D>`,
                    inline: false
                });
            }

            // Get all members and organize by role
            await interaction.guild.members.fetch();
            const roleHierarchy = interaction.guild.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position);

            // Group members by their highest role
            const staffByRole = new Map();
            
            for (const role of roleHierarchy.values()) {
                const membersWithRole = role.members
                    .filter(member => !member.user.bot)
                    .sort((a, b) => a.user.username.localeCompare(b.user.username));

                if (membersWithRole.size > 0) {
                    staffByRole.set(role, membersWithRole);
                }
            }

            // Add staff sections to embed
            let fieldCount = 1; // Start at 1 because we already added server info
            for (const [role, members] of staffByRole) {
                if (fieldCount >= 25) break; // Discord embed field limit

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

                    // Check if adding this member would exceed field value limit (1024 chars)
                    if ((memberList + memberInfo).length > 1024) {
                        break;
                    }

                    memberList += memberInfo;
                }

                if (memberList) {
                    const memberCount = members.size;
                    embed.addFields({
                        name: `${roleEmoji} ${role.name} – ${memberCount}`,
                        value: memberList || '...',
                        inline: false
                    });
                    fieldCount++;
                }
            }

            // If no staff roles found, add a note
            if (staffByRole.size === 0) {
                embed.addFields({
                    name: '👥 Staff Members',
                    value: 'No staff roles configured yet. Assign roles to members to display them here.',
                    inline: false
                });
            }

            // Send the embed
            const sentMessage = await targetChannel.send({ embeds: [embed] });

            // Save embed info to database for auto-updates
            try {
                await query(
                    `INSERT INTO staff_embeds (guild_id, channel_id, message_id, created_at) 
                     VALUES (?, ?, ?, ?)`,
                    [interaction.guild.id, targetChannel.id, sentMessage.id, Date.now()]
                );
            } catch (dbErr) {
                console.error('Failed to save embed info:', dbErr);
            }

            await interaction.editReply({
                content: `✅ Verification embed sent successfully to ${targetChannel}!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error sending verification embed:', error);
            const errorMessage = interaction.deferred 
                ? { content: '❌ Failed to send verification embed. Please try again.', ephemeral: true }
                : '❌ Failed to send verification embed. Please try again.';
            
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    getRoleEmoji(roleName) {
        // Map common role keywords to emojis
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
            'lead': '🫟'
        };

        const lowerName = roleName.toLowerCase();
        for (const [keyword, emoji] of Object.entries(emojiMap)) {
            if (lowerName.includes(keyword)) {
                return emoji;
            }
        }

        return '📌'; // Default emoji
    }
};
