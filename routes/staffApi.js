const express = require('express');
const router = express.Router();

// Get staff verification data
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

        // Fetch all members
        await guild.members.fetch();

        // Get all roles sorted by position (highest first)
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
                memberCount: role.members.size
            }));

        // Get staff members organized by role
        const staffByRole = [];

        for (const role of guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .values()) {
            
            const members = role.members
                .filter(member => !member.user.bot)
                .map(member => ({
                    id: member.user.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    tag: member.user.tag,
                    avatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
                    createdAt: member.user.createdTimestamp,
                    joinedAt: member.joinedTimestamp,
                    roles: member.roles.cache
                        .filter(r => r.name !== '@everyone')
                        .sort((a, b) => b.position - a.position)
                        .map(r => ({
                            id: r.id,
                            name: r.name,
                            color: r.hexColor
                        }))
                }))
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
            roles,
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
        'lead': '🫟'
    };

    const lowerName = roleName.toLowerCase();
    for (const [keyword, emoji] of Object.entries(emojiMap)) {
        if (lowerName.includes(keyword)) {
            return emoji;
        }
    }

    return '📌';
}

module.exports = router;
