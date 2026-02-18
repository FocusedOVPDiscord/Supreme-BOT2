const express = require('express');
const axios = require('axios');
const { EmbedBuilder, ChannelType, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');
const { query } = require('../utils/db');
const { saveTranscriptToDashboard, formatMessagesForDashboard } = require('../utils/dashboardTranscript');

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/dashboard/login';
const BOT_INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

// Audit log action name mapping
const AUDIT_ACTION_NAMES = {
    [AuditLogEvent.ChannelCreate]: 'Channel Created',
    [AuditLogEvent.ChannelDelete]: 'Channel Deleted',
    [AuditLogEvent.ChannelUpdate]: 'Channel Updated',
    [AuditLogEvent.MemberBanAdd]: 'Member Banned',
    [AuditLogEvent.MemberBanRemove]: 'Member Unbanned',
    [AuditLogEvent.MemberKick]: 'Member Kicked',
    [AuditLogEvent.MemberUpdate]: 'Member Updated',
    [AuditLogEvent.MemberRoleUpdate]: 'Role Updated',
    [AuditLogEvent.RoleCreate]: 'Role Created',
    [AuditLogEvent.RoleDelete]: 'Role Deleted',
    [AuditLogEvent.RoleUpdate]: 'Role Updated',
    [AuditLogEvent.MessageDelete]: 'Message Deleted',
    [AuditLogEvent.MessageBulkDelete]: 'Messages Bulk Deleted',
    [AuditLogEvent.InviteCreate]: 'Invite Created',
    [AuditLogEvent.InviteDelete]: 'Invite Deleted',
    [AuditLogEvent.EmojiCreate]: 'Emoji Created',
    [AuditLogEvent.EmojiDelete]: 'Emoji Deleted',
    [AuditLogEvent.GuildUpdate]: 'Server Updated',
    [AuditLogEvent.WebhookCreate]: 'Webhook Created',
    [AuditLogEvent.WebhookDelete]: 'Webhook Deleted',
    [AuditLogEvent.MemberMove]: 'Member Moved',
    [AuditLogEvent.MemberDisconnect]: 'Member Disconnected',
    [AuditLogEvent.BotAdd]: 'Bot Added',
    [AuditLogEvent.ChannelOverwriteCreate]: 'Permission Created',
    [AuditLogEvent.ChannelOverwriteUpdate]: 'Permission Updated',
    [AuditLogEvent.ChannelOverwriteDelete]: 'Permission Deleted',
    [AuditLogEvent.StickerCreate]: 'Sticker Created',
    [AuditLogEvent.StickerDelete]: 'Sticker Deleted',
    [AuditLogEvent.ThreadCreate]: 'Thread Created',
    [AuditLogEvent.ThreadDelete]: 'Thread Deleted',
};

/**
 * Check if user has manage permissions (Administrator or Owner)
 */
function hasManagePermissions(permissions) {
    // Discord permissions are returned as a string bitfield
    const permissionBits = BigInt(permissions);
    const adminBit = BigInt(PermissionFlagsBits.Administrator);
    const manageGuildBit = BigInt(PermissionFlagsBits.ManageGuild);
    
    return (permissionBits & adminBit) === adminBit || (permissionBits & manageGuildBit) === manageGuildBit;
}

/**
 * Get selected guild
 */
function getSelectedGuild(req) {
    const client = req.app.locals.client;
    const selectedGuildId = req.session.selectedGuildId;
    
    if (selectedGuildId) {
        const guild = client.guilds.cache.get(selectedGuildId);
        if (guild) return guild;
    }
    
    return null;
}

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * Middleware to check if user has access to selected guild
 */
const requireGuildAccess = async (req, res, next) => {
    const guild = getSelectedGuild(req);
    if (!guild) {
        return res.status(404).json({ error: 'No server selected' });
    }
    
    const userId = req.session.user.id;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }
        
        // Check if user has Administrator or Manage Server permissions
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
            !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return res.status(403).json({ error: 'You do not have permission to manage this server' });
        }
        
        next();
    } catch (error) {
        console.error('Guild access check error:', error);
        res.status(500).json({ error: 'Failed to verify permissions' });
    }
};

/**
 * GET /api/dashboard/auth/me
 */
router.get('/auth/me', async (req, res) => {
    if (req.session && req.session.user) {
        return res.json(req.session.user);
    }
    res.status(401).json({ error: 'Not authenticated' });
});

/**
 * GET /api/dashboard/auth/url
 * Returns the Discord OAuth2 URL
 */
router.post('/auth/url', async (req, res) => {
    try {
        const { turnstileToken } = req.body;
        
        if (!turnstileToken) {
            return res.status(400).json({ error: 'Security verification required' });
        }

        // Verify Turnstile token with Cloudflare
        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAACe1LlZJrP6OMIEhPga0I2QYTDI';
        const verifyResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: turnstileSecret,
            response: turnstileToken,
        });

        if (!verifyResponse.data.success) {
            console.error('[TURNSTILE] Verification failed:', verifyResponse.data);
            return res.status(403).json({ error: 'Security verification failed' });
        }

        console.log('[TURNSTILE] Verification successful');
        
        // Generate OAuth URL
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
        res.json({ url: authUrl });
    } catch (error) {
        console.error('[TURNSTILE] Error:', error);
        res.status(500).json({ error: 'Security verification error' });
    }
});

/**
 * POST /api/dashboard/auth/callback
 * OAuth2 callback endpoint - processes the code from Discord
 */
router.post('/auth/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No authorization code provided' });
        }

        // Exchange code for access token with retry logic
        let tokenResponse;
        let retries = 3;
        while (retries > 0) {
            try {
                tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', 
                    new URLSearchParams({
                        client_id: DISCORD_CLIENT_ID,
                        client_secret: DISCORD_CLIENT_SECRET,
                        grant_type: 'authorization_code',
                        code: code,
                        redirect_uri: REDIRECT_URI,
                    }), {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        timeout: 10000
                    }
                );
                break; // Success
            } catch (err) {
                if (err.response?.status === 429) {
                    // Rate limited - wait and retry
                    const retryAfter = err.response.headers['retry-after'] || 5;
                    console.warn(`⚠️ [OAUTH] Rate limited, retrying after ${retryAfter}s`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    retries--;
                    if (retries === 0) throw err;
                } else {
                    throw err;
                }
            }
        }

        const { access_token } = tokenResponse.data;

        // Get user info with retry logic
        let userResponse;
        retries = 3;
        while (retries > 0) {
            try {
                userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
                    headers: { 'Authorization': `Bearer ${access_token}` },
                    timeout: 10000
                });
                break; // Success
            } catch (err) {
                if (err.response?.status === 429) {
                    const retryAfter = err.response.headers['retry-after'] || 5;
                    console.warn(`⚠️ [OAUTH] Rate limited, retrying after ${retryAfter}s`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    retries--;
                    if (retries === 0) throw err;
                } else {
                    throw err;
                }
            }
        }

        const discordUser = userResponse.data;

        // Store user in session
        req.session.user = {
            id: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            access_token: access_token
        };

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ success: true, user: req.session.user });
    } catch (error) {
        console.error('OAuth callback error:', error.response?.data || error.message);
        if (error.response?.status === 429) {
            res.status(429).json({ error: 'Rate limited. Please try again in a few seconds.' });
        } else {
            res.status(500).json({ error: 'Authentication failed', details: error.response?.data?.message || error.message });
        }
    }
});

/**
 * POST /api/dashboard/auth/logout
 */
router.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

/**
 * GET /api/dashboard/guilds
 * Returns all guilds where user has manage permissions
 */
router.get('/guilds', requireAuth, async (req, res) => {
    try {
        const access_token = req.session.user.access_token;
        
        // Get user's guilds from Discord API
        const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });

        const userGuilds = guildsResponse.data;
        const client = req.app.locals.client;
        const managedGuilds = [];

        console.log(`[GUILDS] User has ${userGuilds.length} total guilds`);

        for (const guild of userGuilds) {
            const hasPerms = hasManagePermissions(guild.permissions);
            console.log(`[GUILDS] ${guild.name}: hasPerms=${hasPerms}, permissions=${guild.permissions}`);
            
            // Check if user has manage permissions
            if (hasPerms) {
                const botGuild = client.guilds.cache.get(guild.id);
                
                managedGuilds.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
                    owner: guild.owner,
                    botInGuild: !!botGuild,
                    memberCount: botGuild?.memberCount || null
                });
            }
        }

        res.json({ 
            guilds: managedGuilds,
            botInviteUrl: BOT_INVITE_URL
        });
    } catch (error) {
        console.error('Guilds fetch error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

/**
 * POST /api/dashboard/select-guild
 */
router.post('/select-guild', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.body;
        const client = req.app.locals.client;
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Bot is not in this server' });
        }

        // Verify user has permissions in this guild
        const userId = req.session.user.id;
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }
        
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
            !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return res.status(403).json({ error: 'You do not have permission to manage this server' });
        }

        req.session.selectedGuildId = guildId;
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ 
            success: true, 
            guild: { 
                id: guild.id, 
                name: guild.name,
                icon: guild.iconURL({ size: 128 })
            } 
        });
    } catch (error) {
        console.error('Select guild error:', error);
        res.status(500).json({ error: 'Failed to select server' });
    }
});

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', requireAuth, requireGuildAccess, async (req, res) => {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    // Get active tickets and clean up stale entries
    const activeTicketsData = storage.get(guild.id, 'active_tickets') || {};
    const validTickets = {};
    
    // Verify each ticket channel still exists
    for (const [channelId, data] of Object.entries(activeTicketsData)) {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            validTickets[channelId] = data;
        }
    }
    
    // Update storage if we found stale entries
    if (Object.keys(validTickets).length !== Object.keys(activeTicketsData).length) {
        await storage.set(guild.id, 'active_tickets', validTickets);
    }
    
    const activeTicketsCount = Object.keys(validTickets).length;
    
    // Count closed tickets from database
    let closedTicketsCount = 0;
    try {
        const results = await query('SELECT COUNT(*) as count FROM transcripts WHERE guild_id = ?', [guild.id]);
        closedTicketsCount = results[0]?.count || 0;
    } catch (error) {
        console.error('Error counting closed tickets:', error);
    }

    // Get bot uptime (convert from milliseconds to seconds)
    const client = req.app.locals.client;
    const uptime = client.uptime ? Math.floor(client.uptime / 1000) : 0;
    
    // Get channels and roles count
    const channelsCount = guild.channels.cache.size;
    const rolesCount = guild.roles.cache.size;
    
    // Get bot status
    const botStatus = client.user ? 'Online' : 'Offline';
    
    // Get recent tickets (last 5)
    let recentTickets = [];
    try {
        const results = await query(
            'SELECT id, user, closed_at FROM transcripts WHERE guild_id = ? ORDER BY closed_at DESC LIMIT 5',
            [guild.id]
        );
        recentTickets = results.map(ticket => ({
            id: ticket.id,
            title: `Ticket #${ticket.user || '0000'}`,
            status: 'Closed'
        }));
    } catch (error) {
        console.error('Error fetching recent tickets:', error);
    }
    
    res.json({
        serverName: guild.name,
        guildIcon: guild.iconURL({ size: 128 }),
        totalMembers: guild.memberCount,
        activeTickets: activeTicketsCount,
        closedTickets: closedTicketsCount,
        totalTickets: activeTicketsCount + closedTicketsCount,
        uptime: uptime,
        channels: channelsCount,
        roles: rolesCount,
        botStatus: botStatus,
        recentTickets: recentTickets
    });
});

/**
 * GET /api/dashboard/members
 */
router.get('/members', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        await guild.members.fetch();
        const members = guild.members.cache.map(member => ({
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.displayAvatarURL({ size: 64 }),
            joinedAt: member.joinedTimestamp,
            roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor
            })).filter(role => role.id !== guild.id)
        }));

        res.json(members);
    } catch (error) {
        console.error('Members fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

/**
 * GET /api/dashboard/roles
 */
router.get('/roles', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const roles = guild.roles.cache
            .filter(role => role.id !== guild.id)
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
                memberCount: role.members.size
            }))
            .sort((a, b) => b.position - a.position);

        res.json(roles);
    } catch (error) {
        console.error('Roles fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

/**
 * GET /api/dashboard/channels
 */
router.get('/channels', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const channels = guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            position: channel.position,
            parentId: channel.parentId
        })).sort((a, b) => a.position - b.position);

        res.json(channels);
    } catch (error) {
        console.error('Channels fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

/**
 * GET /api/dashboard/invites
 */
router.get('/invites', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const inviteData = await inviteManager.getInviteLeaderboard(guild.id);
        res.json(inviteData);
    } catch (error) {
        console.error('Invites fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch invites' });
    }
});

/**
 * GET /api/dashboard/tickets
 * Returns FLAT ARRAY of active tickets only (frontend expects Array.isArray(data))
 */
router.get('/tickets', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Get active tickets and clean up stale entries
        const activeTicketsData = storage.get(guild.id, 'active_tickets') || {};
        const tickets = [];
        let hasStale = false;
        
        for (const [channelId, data] of Object.entries(activeTicketsData)) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                const num = data.ticketNumber || '0000';
                tickets.push({
                    id: channelId,
                    ticketNumber: `${num}`,
                    user: data.user || 'Unknown',
                    userId: data.userId,
                    created: data.created || data.createdAt || new Date().toISOString(),
                    status: 'active'
                });
            } else {
                hasStale = true;
            }
        }

        // Clean up stale entries
        if (hasStale) {
            const validTickets = {};
            for (const [channelId, data] of Object.entries(activeTicketsData)) {
                if (guild.channels.cache.get(channelId)) {
                    validTickets[channelId] = data;
                }
            }
            await storage.set(guild.id, 'active_tickets', validTickets);
        }

        res.json(tickets);
    } catch (error) {
        console.error('Tickets fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/dashboard/tickets/:id/messages
 * Returns messages from an active ticket channel
 */
router.get('/tickets/:id/messages', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const channel = guild.channels.cache.get(req.params.id);
        if (!channel) return res.status(404).json({ error: 'Ticket channel not found' });

        // Fetch messages from the channel
        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const messages = Array.from(fetchedMessages.values())
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map(msg => ({
                id: msg.id,
                author: {
                    username: msg.author.username,
                    avatar: msg.author.displayAvatarURL({ size: 64 }),
                    bot: msg.author.bot
                },
                content: msg.content || (msg.embeds.length > 0 ? '[Embed]' : ''),
                timestamp: msg.createdTimestamp,
                attachments: Array.from(msg.attachments.values()).map(a => a.url)
            }));

        res.json(messages);
    } catch (error) {
        console.error('Ticket messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * DELETE /api/dashboard/tickets/:id
 * Deletes a ticket channel from Discord
 */
router.delete('/tickets/:id', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const channel = guild.channels.cache.get(req.params.id);
        if (channel) {
            await channel.delete('Deleted from dashboard');
        }

        // Remove from active tickets storage
        const activeTickets = storage.get(guild.id, 'active_tickets') || {};
        if (activeTickets[req.params.id]) {
            delete activeTickets[req.params.id];
            await storage.set(guild.id, 'active_tickets', activeTickets);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ticket delete error:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

/**
 * GET /api/dashboard/audit-logs
 */
router.get('/audit-logs', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const auditLogs = await guild.fetchAuditLogs({ limit: 50 });
        const logs = auditLogs.entries.map(entry => ({
            id: entry.id,
            action: AUDIT_ACTION_NAMES[entry.action] || entry.action,
            executorId: entry.executor?.id,
            executorName: entry.executor?.username,
            targetId: entry.target?.id,
            targetName: entry.target?.username || entry.target?.name,
            reason: entry.reason,
            createdAt: entry.createdTimestamp
        }));

        res.json(logs);
    } catch (error) {
        console.error('Audit logs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

/**
 * GET /api/dashboard/users - Paginated users endpoint
 */
router.get('/users', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 40;
        const search = req.query.search || '';

        // Fetch all members to ensure we have the full list
        try {
            await guild.members.fetch();
        } catch (e) {
            // If fetch fails (rate limit), fall back to cached members
            console.warn('Members fetch failed, using cache:', e.message);
        }

        let members = Array.from(guild.members.cache.values())
            .filter(m => !m.user.bot); // Exclude bots from user list

        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase();
            members = members.filter(member => 
                member.user.username.toLowerCase().includes(searchLower) ||
                member.user.id.includes(search) ||
                (member.nickname && member.nickname.toLowerCase().includes(searchLower))
            );
        }

        // Sort by joined date (newest first)
        members.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));

        // Get invite data from database
        const inviteMap = {};
        try {
            const inviteRows = await query('SELECT user_id, regular, fake, bonus, `left` FROM invites WHERE guild_id = ?', [guild.id]);
            for (const row of inviteRows) {
                inviteMap[row.user_id] = (row.regular || 0) - (row.left || 0) - (row.fake || 0) + (row.bonus || 0);
            }
        } catch (e) {
            console.warn('Failed to fetch invite data:', e.message);
        }

        // Pagination
        const total = members.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedMembers = members.slice(start, end);

        const users = paginatedMembers.map(member => ({
            id: member.id,
            username: member.user.username,
            avatar: member.user.displayAvatarURL({ size: 64 }),
            invites: inviteMap[member.id] || 0,
            joinedAt: member.joinedTimestamp
        }));

        res.json({
            users: users,
            pagination: {
                page: page,
                totalPages: totalPages,
                total: total,
                limit: limit,
                hasPrev: page > 1,
                hasNext: page < totalPages
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * POST /api/dashboard/users/:id/moderate
 * Moderate a user (warn, mute, kick, ban)
 */
router.post('/users/:id/moderate', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const { action, reason } = req.body;
        const targetId = req.params.id;
        const member = await guild.members.fetch(targetId).catch(() => null);

        if (!member) return res.status(404).json({ error: 'Member not found' });

        switch (action) {
            case 'warn':
                // Store warning in storage
                const warnings = storage.get(guild.id, `warnings_${targetId}`) || [];
                warnings.push({ reason, by: req.session.user.id, at: Date.now() });
                await storage.set(guild.id, `warnings_${targetId}`, warnings);
                try { await member.send(`⚠️ You have been warned in **${guild.name}**: ${reason}`); } catch (e) {}
                break;
            case 'mute':
                await member.timeout(60 * 60 * 1000, reason); // 1 hour timeout
                break;
            case 'kick':
                await member.kick(reason);
                break;
            case 'ban':
                await member.ban({ reason });
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Moderate error:', error);
        res.status(500).json({ error: 'Failed to moderate user' });
    }
});

/**
 * GET /api/dashboard/guild_data - Guild data endpoint
 */
router.get('/guild_data', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 256 }),
            memberCount: guild.memberCount,
            channelCount: guild.channels.cache.size,
            roleCount: guild.roles.cache.size,
            createdAt: guild.createdTimestamp
        });
    } catch (error) {
        console.error('Guild data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch guild data' });
    }
});

/**
 * GET /api/dashboard/giveaways - Giveaways endpoint
 * Returns FLAT ARRAY of all giveaways (frontend expects Array.isArray(data))
 */
router.get('/giveaways', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Fetch all giveaways from storage
        const allGiveawayIds = storage.get(guild.id, 'all_giveaways') || [];
        const giveaways = [];
        
        for (const messageId of allGiveawayIds) {
            const meta = storage.get(guild.id, `giveaway_meta_${messageId}`);
            if (meta) {
                // Get live participant count from reaction storage
                const participantIds = storage.get(guild.id, `giveaway_${messageId}`) || [];
                
                giveaways.push({
                    id: messageId,
                    prize: meta.prize || 'Unknown Prize',
                    hostTag: meta.hostTag || 'Unknown',
                    status: meta.status || 'active',
                    endTime: meta.endTime || null, // Already stored as unix seconds
                    participants: meta.participantCount || participantIds.length || 0,
                    winnersCount: meta.winnersCount || meta.winnerCount || 1,
                    winners: meta.winners || []
                });
            }
        }
        
        res.json(giveaways);
    } catch (error) {
        console.error('Giveaways fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch giveaways' });
    }
});

/**
 * POST /api/dashboard/giveaways/:id/end
 * End a giveaway early from the dashboard
 */
router.post('/giveaways/:id/end', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const messageId = req.params.id;
        const meta = storage.get(guild.id, `giveaway_meta_${messageId}`);
        if (!meta) return res.status(404).json({ error: 'Giveaway not found' });

        // Get participants
        const participants = storage.get(guild.id, `giveaway_${messageId}`) || [];
        const winnersCount = meta.winnersCount || meta.winnerCount || 1;
        
        // Pick random winners
        const winners = [];
        const pool = [...participants];
        for (let i = 0; i < Math.min(winnersCount, pool.length); i++) {
            const idx = Math.floor(Math.random() * pool.length);
            winners.push(pool.splice(idx, 1)[0]);
        }

        // Update metadata
        meta.status = 'ended';
        meta.winners = winners;
        meta.participantCount = participants.length;
        await storage.set(guild.id, `giveaway_meta_${messageId}`, meta);

        // Try to send end message in the channel
        try {
            const channel = guild.channels.cache.get(meta.channelId);
            if (channel) {
                if (winners.length > 0) {
                    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                    await channel.send(`\uD83C\uDF89 The giveaway for **${meta.prize}** has ended! Winners: ${winnerMentions}`);
                } else {
                    await channel.send(`The giveaway for **${meta.prize}** has ended, but no one participated.`);
                }
            }
        } catch (e) {
            console.error('Failed to send giveaway end message:', e);
        }

        res.json({ success: true, winners });
    } catch (error) {
        console.error('End giveaway error:', error);
        res.status(500).json({ error: 'Failed to end giveaway' });
    }
});

/**
 * DELETE /api/dashboard/giveaways/:id
 * Delete a giveaway from the dashboard
 */
router.delete('/giveaways/:id', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const messageId = req.params.id;
        const meta = storage.get(guild.id, `giveaway_meta_${messageId}`);

        // Try to delete the giveaway message from Discord
        if (meta && meta.channelId) {
            try {
                const channel = guild.channels.cache.get(meta.channelId);
                if (channel) {
                    const msg = await channel.messages.fetch(messageId).catch(() => null);
                    if (msg) await msg.delete();
                }
            } catch (e) {
                console.error('Failed to delete giveaway message:', e);
            }
        }

        // Remove from storage
        await storage.set(guild.id, `giveaway_meta_${messageId}`, undefined);
        await storage.set(guild.id, `giveaway_${messageId}`, undefined);
        
        // Remove from all_giveaways list
        const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];
        const filtered = allGiveaways.filter(id => id !== messageId);
        await storage.set(guild.id, 'all_giveaways', filtered);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete giveaway error:', error);
        res.status(500).json({ error: 'Failed to delete giveaway' });
    }
});

/**
 * GET /api/dashboard/transcripts - Transcripts endpoint
 */
router.get('/transcripts', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const transcripts = await query(
            'SELECT id, guild_id, user, closed_at, messages FROM transcripts WHERE guild_id = ? ORDER BY closed_at DESC LIMIT 100',
            [guild.id]
        );

        res.json(
            transcripts.map(t => {
                let messages = [];
                try {
                    messages = t.messages ? (typeof t.messages === 'string' ? JSON.parse(t.messages) : t.messages) : [];
                } catch (e) {
                    messages = [];
                }
                // t.user contains the ticket number (e.g., "0001")
                // Frontend uses transcript.user as the ticket number display: "Ticket #{transcript.user}"
                return {
                    id: t.id,
                    user: t.user, // This is the ticket number, used by frontend as "Ticket #XXXX"
                    closed_at: t.closed_at,
                    messages: messages
                };
            })
        );
    } catch (error) {
        console.error('Transcripts fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch transcripts' });
    }
});

/**
 * GET /api/dashboard/settings - Settings endpoint
 */
router.get('/settings', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Fetch auto-role from storage (same key as /auto-role command)
        const autoRoleId = storage.get(guild.id, 'autoRoleId') || '';
        
        // Fetch ticket category from storage
        const ticketCategory = storage.get(guild.id, 'ticketCategoryId') || '';

        res.json({
            autoRole: autoRoleId,
            ticketCategory: ticketCategory
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * POST /api/dashboard/settings - Save bot settings
 */
router.post('/settings', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        const { autoRole, ticketCategory } = req.body;

        // Save auto-role (same key as /auto-role command)
        if (autoRole !== undefined) {
            storage.set(guild.id, 'autoRoleId', autoRole || null);
        }

        // Save ticket category
        if (ticketCategory !== undefined) {
            storage.set(guild.id, 'ticketCategoryId', ticketCategory || null);
        }

        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

/**
 * GET /api/dashboard/guild-data - Guild data with roles and channels for dropdowns
 */
router.get('/guild-data', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Get roles (exclude @everyone and managed/bot roles)
        const roles = guild.roles.cache
            .filter(role => role.id !== guild.id && !role.managed)
            .sort((a, b) => b.position - a.position)
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor !== '#000000' ? role.hexColor : null,
                position: role.position
            }));

        // Get text channels
        const channels = guild.channels.cache
            .filter(ch => ch.type === 0) // Text channels only
            .sort((a, b) => a.position - b.position)
            .map(ch => ({
                id: ch.id,
                name: ch.name
            }));

        res.json({ roles, channels });
    } catch (error) {
        console.error('Guild data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch guild data' });
    }
});

module.exports = router;
