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
            title: `Ticket by User ${ticket.user ? ticket.user.slice(0, 8) : 'Unknown'}`,
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
 */
router.get('/tickets', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Get active tickets and clean up stale entries
        const activeTicketsData = storage.get(guild.id, 'active_tickets') || {};
        const validActiveTickets = [];
        
        for (const [channelId, data] of Object.entries(activeTicketsData)) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                validActiveTickets.push({
                    id: channelId,
                    channelId: channelId,
                    user: data.user || 'Unknown',
                    userId: data.userId,
                    created: data.created || data.createdAt,
                    status: 'active',
                    ticketNumber: data.ticketNumber || '0000'
                });
            }
        }

        const closedTickets = await query(
            'SELECT id, guild_id, user, closed_at, messages FROM transcripts WHERE guild_id = ? ORDER BY closed_at DESC LIMIT 50',
            [guild.id]
        );

        res.json({
            active: validActiveTickets,
            closed: closedTickets.map(ticket => {
                const messages = ticket.messages ? (typeof ticket.messages === 'string' ? JSON.parse(ticket.messages) : ticket.messages) : [];
                const ticketNumber = ticket.user; // user field contains ticket number (e.g., "0001")
                const actualUser = messages.length > 0 ? messages[0].author : 'Unknown';
                
                return {
                    id: ticket.id,
                    ticketNumber: ticketNumber,
                    user: actualUser,
                    userId: ticket.user,
                    created: ticket.closed_at, // We don't have created timestamp, use closed as fallback
                    closedAt: ticket.closed_at,
                    status: 'closed',
                    messageCount: messages.length,
                    messages: messages
                };
            })
        });
    } catch (error) {
        console.error('Tickets fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
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

        // Use cached members only to avoid rate limiting
        let members = Array.from(guild.members.cache.values());

        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase();
            members = members.filter(member => 
                member.user.username.toLowerCase().includes(searchLower) ||
                member.user.tag.toLowerCase().includes(searchLower)
            );
        }

        // Pagination
        const total = members.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedMembers = members.slice(start, end);

        const users = paginatedMembers.map(member => ({
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            tag: member.user.tag,
            avatar: member.user.displayAvatarURL({ size: 64 }),
            joinedAt: member.joinedTimestamp,
            roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor
            })).filter(role => role.id !== guild.id)
        }));

        res.json({
            users: users,
            pagination: {
                page: page,
                totalPages: totalPages,
                total: total,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
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
 */
router.get('/giveaways', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guild = getSelectedGuild(req);
        if (!guild) return res.status(404).json({ error: 'No server selected' });

        // Fetch all giveaways from storage
        const allGiveawayIds = storage.get(guild.id, 'all_giveaways') || [];
        
        const activeGiveaways = [];
        const endedGiveaways = [];
        
        for (const messageId of allGiveawayIds) {
            const meta = storage.get(guild.id, `giveaway_meta_${messageId}`);
            if (meta) {
                const giveawayData = {
                    id: messageId,
                    messageId: meta.messageId,
                    channelId: meta.channelId,
                    prize: meta.prize,
                    winnerCount: meta.winnerCount,
                    endTime: meta.endTime,
                    createdAt: meta.createdAt,
                    status: meta.status || 'active',
                    participantCount: meta.participantCount || 0,
                    winners: meta.winners || []
                };
                
                if (meta.status === 'ended') {
                    endedGiveaways.push(giveawayData);
                } else {
                    activeGiveaways.push(giveawayData);
                }
            }
        }
        
        res.json({
            active: activeGiveaways,
            ended: endedGiveaways
        });
    } catch (error) {
        console.error('Giveaways fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch giveaways' });
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
                const messages = t.messages ? (typeof t.messages === 'string' ? JSON.parse(t.messages) : t.messages) : [];
                const ticketNumber = t.user; // user field contains ticket number
                const actualUser = messages.length > 0 ? messages[0].author : 'Unknown';
                
                return {
                    id: t.id,
                    ticketNumber: ticketNumber,
                    user: actualUser,
                    userId: t.user,
                    closed_at: t.closed_at,
                    closedAt: t.closed_at,
                    messageCount: messages.length,
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

        // Fetch settings from storage
        const settings = storage.get(guild.id, 'settings') || {};

        res.json({
            guildId: guild.id,
            settings: settings
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

module.exports = router;
