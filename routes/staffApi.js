const express = require('express');
const router = express.Router();

// Cache for member fetches to prevent rate limiting
const memberFetchCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Specific role IDs to include in verification
const STAFF_ROLE_IDS = [
    '1354402446994309123', // Founder
    '1410661468688482314', // Moderator
    '1457664338163667072', // Senior Middleman
    '1470227366692392960', // Trainee Middleman
    '1467922047148625920'  // Trusted
];

// Get staff verification data (filtered by specific roles)
router.get('/verification/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.get('client');

        if (!client) {
            return res.status(500).json({ error: 'Bot client not available' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Fetch all members with caching to prevent rate limiting
        const now = Date.now();
        const cacheKey = guildId;
        const cached = memberFetchCache.get(cacheKey);
        
        if (!cached || (now - cached.timestamp) > CACHE_DURATION) {
            try {
                await guild.members.fetch();
                memberFetchCache.set(cacheKey, { timestamp: now });
            } catch (fetchError) {
                if (fetchError.code !== 'RATE_LIMITED') {
                    throw fetchError;
                }
            }
        }

        // Get all staff custom info from database
        const { query } = require('../utils/db');
        const staffInfoData = await query(
            'SELECT * FROM staff_info WHERE guild_id = ?',
            [guildId]
        );

        const staffInfoMap = {};
        staffInfoData.forEach(row => {
            staffInfoMap[row.user_id] = {
                mainEpic: row.main_epic,
                additionalMM: row.additional_mm,
                customNotes: row.custom_notes
            };
        });

        // Get staff members organized by role (only specific roles)
        const staffByRole = [];

        const staffRoles = STAFF_ROLE_IDS
            .map(roleId => guild.roles.cache.get(roleId))
            .filter(role => role !== undefined)
            .sort((a, b) => b.position - a.position);

        for (const role of staffRoles) {
            const members = role.members
                .filter(member => !member.user.bot)
                .map(member => {
                    const customInfo = staffInfoMap[member.user.id] || {};
                    return {
                        id: member.user.id,
                        username: member.user.username,
                        discriminator: member.user.discriminator,
                        tag: member.user.tag,
                        avatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
                        createdAt: member.user.createdTimestamp,
                        joinedAt: member.joinedTimestamp,
                        mainEpic: customInfo.mainEpic,
                        additionalMM: customInfo.additionalMM,
                        customNotes: customInfo.customNotes,
                        roles: member.roles.cache
                            .filter(r => r.name !== '@everyone')
                            .sort((a, b) => b.position - a.position)
                            .map(r => ({
                                id: r.id,
                                name: r.name,
                                color: r.hexColor
                            }))
                    };
                })
                .sort((a, b) => a.username.localeCompare(b.username));

            if (members.length > 0) {
                staffByRole.push({
                    role: {
                        id: role.id,
                        name: role.name,
                        color: role.hexColor,
                        position: role.position,
                        emoji: getRoleEmoji(role.name)
                    },
                    members
                });
            }
        }

        // Guild info
        const guildInfo = {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 256 }),
            memberCount: guild.memberCount,
            createdAt: guild.createdTimestamp
        };

        res.json({
            guild: guildInfo,
            staffByRole
        });

    } catch (error) {
        console.error('Error fetching staff verification:', error);
        res.status(500).json({ error: 'Failed to fetch staff verification data' });
    }
});

// Get role emoji mapping
function getRoleEmoji(roleName) {
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

// Update staff member custom info
router.post('/info/:guildId/:userId', async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const { mainEpic, additionalMM, customNotes } = req.body;
        const client = req.app.get('client');

        if (!client) {
            return res.status(500).json({ error: 'Bot client not available' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Verify user is a member of the guild
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const { query } = require('../utils/db');
        
        // Insert or update staff info
        await query(
            `INSERT INTO staff_info (guild_id, user_id, main_epic, additional_mm, custom_notes, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             main_epic = VALUES(main_epic), 
             additional_mm = VALUES(additional_mm), 
             custom_notes = VALUES(custom_notes), 
             updated_at = VALUES(updated_at)`,
            [guildId, userId, mainEpic || null, additionalMM || null, customNotes || null, Date.now()]
        );

        res.json({ success: true, message: 'Staff info updated successfully' });

    } catch (error) {
        console.error('Error updating staff info:', error);
        res.status(500).json({ error: 'Failed to update staff info' });
    }
});

// Get staff member custom info
router.get('/info/:guildId/:userId', async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const { query } = require('../utils/db');
        
        const result = await query(
            'SELECT * FROM staff_info WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
        );

        if (result.length === 0) {
            return res.json({ mainEpic: null, additionalMM: null, customNotes: null });
        }

        res.json({
            mainEpic: result[0].main_epic,
            additionalMM: result[0].additional_mm,
            customNotes: result[0].custom_notes
        });

    } catch (error) {
        console.error('Error fetching staff info:', error);
        res.status(500).json({ error: 'Failed to fetch staff info' });
    }
});

// Get all staff info for a guild
router.get('/info/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { query } = require('../utils/db');
        
        const result = await query(
            'SELECT * FROM staff_info WHERE guild_id = ?',
            [guildId]
        );

        const staffInfo = {};
        result.forEach(row => {
            staffInfo[row.user_id] = {
                mainEpic: row.main_epic,
                additionalMM: row.additional_mm,
                customNotes: row.custom_notes
            };
        });

        res.json(staffInfo);

    } catch (error) {
        console.error('Error fetching all staff info:', error);
        res.status(500).json({ error: 'Failed to fetch staff info' });
    }
});

// Save embed message ID for auto-update
router.post('/embed/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channelId, messageId } = req.body;
        const { query } = require('../utils/db');
        
        await query(
            `INSERT INTO staff_embeds (guild_id, channel_id, message_id, created_at) 
             VALUES (?, ?, ?, ?)`,
            [guildId, channelId, messageId, Date.now()]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Error saving embed info:', error);
        res.status(500).json({ error: 'Failed to save embed info' });
    }
});

// Update all embeds for a guild
router.post('/embed/:guildId/update', async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.get('client');
        const { query } = require('../utils/db');

        if (!client) {
            return res.status(500).json({ error: 'Bot client not available' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Get all saved embeds for this guild
        const embeds = await query(
            'SELECT * FROM staff_embeds WHERE guild_id = ?',
            [guildId]
        );

        if (embeds.length === 0) {
            return res.json({ success: true, message: 'No embeds to update' });
        }

        // Get staff info
        const staffInfoData = await query(
            'SELECT * FROM staff_info WHERE guild_id = ?',
            [guildId]
        );

        const staffInfo = {};
        staffInfoData.forEach(row => {
            staffInfo[row.user_id] = {
                mainEpic: row.main_epic,
                additionalMM: row.additional_mm,
                customNotes: row.custom_notes
            };
        });

        // Update each embed
        const { EmbedBuilder } = require('discord.js');
        let updatedCount = 0;

        for (const embedData of embeds) {
            try {
                const channel = await guild.channels.fetch(embedData.channel_id).catch(() => null);
                if (!channel) continue;

                const message = await channel.messages.fetch(embedData.message_id).catch(() => null);
                if (!message) continue;

                // Rebuild the embed with updated info
                const embed = await buildStaffEmbed(guild, staffInfo);
                await message.edit({ embeds: [embed] });
                updatedCount++;

            } catch (err) {
                console.error('Error updating embed:', err);
            }
        }

        res.json({ success: true, message: `Updated ${updatedCount} embed(s)` });

    } catch (error) {
        console.error('Error updating embeds:', error);
        res.status(500).json({ error: 'Failed to update embeds' });
    }
});

// Helper function to build staff embed
async function buildStaffEmbed(guild, staffInfo) {
    const { EmbedBuilder } = require('discord.js');
    
    // Use cached members if available to prevent rate limiting
    const now = Date.now();
    const cacheKey = guild.id;
    const cached = memberFetchCache.get(cacheKey);
    
    if (!cached || (now - cached.timestamp) > CACHE_DURATION) {
        try {
            await guild.members.fetch();
            memberFetchCache.set(cacheKey, { timestamp: now });
        } catch (fetchError) {
            if (fetchError.code !== 'RATE_LIMITED') {
                throw fetchError;
            }
            // If rate limited, continue with cached members
        }
    }

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

    embed.addFields({
        name: '🌐 Official Supreme MM Server',
        value: 
            `**Official Supreme Invite:** https://discord.gg/smmp\n` +
            `**Official Supreme MM Server ID:** 1354399868851978322\n` +
            `All official Middleman cases are handled **exclusively** on this server,\n` +
            `with verified Supreme MM staff and through the official ticket system.`,
        inline: false
    });

    const staffRoles = STAFF_ROLE_IDS
        .map(roleId => guild.roles.cache.get(roleId))
        .filter(role => role !== undefined)
        .sort((a, b) => b.position - a.position);

    let fieldCount = 1;
    for (const role of staffRoles) {
        if (fieldCount >= 25) break;

        const members = role.members
            .filter(member => !member.user.bot)
            .sort((a, b) => a.user.username.localeCompare(b.user.username));

        if (members.size === 0) continue;

        const roleEmoji = getRoleEmoji(role.name);
        let memberList = '';

        for (const member of members.values()) {
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
            const info = staffInfo[member.user.id] || {};
            
            let memberInfo = 
                `**Name:** <@${member.user.id}>\n` +
                `**User ID:** ${member.user.id}\n` +
                `**Account created:** ${accountCreated}\n` +
                `**Role:** ${role}`;
            
            if (info.mainEpic) {
                memberInfo += `\n**Main Epic:** ${info.mainEpic.replace(/_/g, '\\_')}`;
            }
            if (info.additionalMM) {
                memberInfo += `\n**Additional MM:** ${info.additionalMM.replace(/_/g, '\\_')}`;
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

    return embed;
}

module.exports = router;
