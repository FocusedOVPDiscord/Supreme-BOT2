const express = require('express');
const axios = require('axios');
const { EmbedBuilder, ChannelType } = require('discord.js');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');
const { query } = require('../utils/db');
const { saveTranscriptToDashboard, formatMessagesForDashboard } = require('../utils/dashboardTranscript');

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/dashboard/login';
const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314'];

// Get client IP address
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// Get selected guild or default
function getSelectedGuild(req) {
  const client = req.app.locals.client;
  const selectedGuildId = req.session.selectedGuildId;
  
  if (selectedGuildId) {
    const guild = client.guilds.cache.get(selectedGuildId);
    if (guild) return guild;
  }
  
  return client.guilds.cache.first();
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
 * GET /api/dashboard/auth/me
 */
router.get('/auth/me', async (req, res) => {
  if (req.session && req.session.user) {
    return res.json(req.session.user);
  }
  
  const clientIP = getClientIP(req);
  try {
    const results = await query('SELECT * FROM trusted_ips WHERE ip = ?', [clientIP]);
    if (results.length > 0) {
      const trustedUser = results[0];
      const client = req.app.locals.client;
      const guild = client.guilds.cache.first();
      
      if (guild) {
        const member = await guild.members.fetch(trustedUser.user_id).catch(() => null);
        if (member) {
          const userRoles = member.roles.cache.map(role => role.id);
          const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));
          
          if (isStaff) {
            req.session.user = {
              id: trustedUser.user_id,
              username: trustedUser.username,
              avatar: trustedUser.avatar,
              roles: userRoles,
              isStaff: true
            };
            return res.json(req.session.user);
          }
        }
      }
    }
  } catch (error) {
    console.error('Auto-login verification failed:', error);
  }
  
  res.status(401).json({ error: 'Not authenticated' });
});

/**
 * POST /api/dashboard/auth/callback
 */
router.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', {
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = tokenResponse.data;
    const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    const discordUser = userResponse.data;
    const client = req.app.locals.client;
    const botGuild = client.guilds.cache.first();
    let userRoles = [];

    if (botGuild) {
      const member = await botGuild.members.fetch(discordUser.id).catch(() => null);
      if (member) {
        userRoles = member.roles.cache.map(role => role.id);
      }
    }

    const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));
    if (!isStaff) {
      return res.status(403).json({ error: 'Access denied: Staff only' });
    }

    req.session.user = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      roles: userRoles,
      isStaff: true
    };
    
    const clientIP = getClientIP(req);
    await query(
      'INSERT INTO trusted_ips (ip, user_id, username, avatar, last_login) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE user_id=?, username=?, avatar=?, last_login=NOW()',
      [clientIP, discordUser.id, discordUser.username, discordUser.avatar, discordUser.id, discordUser.username, discordUser.avatar]
    );
    
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('OAuth error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/dashboard/auth/logout
 */
router.post('/auth/logout', async (req, res) => {
  const clientIP = getClientIP(req);
  if (req.body.removeTrustedIP) {
    await query('DELETE FROM trusted_ips WHERE ip = ?', [clientIP]);
  }
  req.session.destroy(() => res.json({ success: true }));
});

/**
 * GET /api/dashboard/guilds
 */
router.get('/guilds', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const userId = req.session.user.id;
    const guilds = [];
    
    for (const [guildId, guild] of client.guilds.cache) {
      let member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
      if (member) {
        const isStaff = member.roles.cache.some(role => STAFF_ROLE_IDS.includes(role.id));
        if (isStaff) {
          guilds.push({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount
          });
        }
      }
    }
    res.json(guilds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/select-guild
 */
router.post('/select-guild', requireAuth, async (req, res) => {
  const { guildId } = req.body;
  const client = req.app.locals.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  req.session.selectedGuildId = guildId;
  req.session.save(() => res.json({ success: true, guild: { id: guild.id, name: guild.name } }));
});

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  // Count active tickets by looking for channels in the ticket category
  const ticketCategory = storage.get(guild.id, 'ticketCategory');
  let activeTickets = 0;
  let recentTickets = [];

  if (ticketCategory) {
    const channels = guild.channels.cache.filter(c => c.parentId === ticketCategory && c.type === ChannelType.GuildText);
    activeTickets = channels.size;
    recentTickets = Array.from(channels.values()).slice(0, 5).map(c => ({
      id: c.id,
      title: c.name,
      status: 'Active'
    }));
  }

  res.json({
    serverName: guild.name,
    totalMembers: guild.memberCount,
    onlineMembers: guild.members.cache.filter(m => m.presence?.status === 'online').size,
    boostCount: guild.premiumSubscriptionCount || 0,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    uptime: process.uptime(),
    botStatus: 'Online',
    activeTickets: activeTickets,
    closedTickets: 0, // Placeholder
    recentTickets: recentTickets
  });
});

/**
 * GET /api/dashboard/guild-data
 */
router.get('/guild-data', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  res.json({
    roles: guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({
      id: r.id,
      name: r.name,
      color: r.hexColor
    })),
    channels: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({
      id: c.id,
      name: c.name
    }))
  });
});

/**
 * GET /api/dashboard/settings
 */
router.get('/settings', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  res.json({
    autoRole: storage.get(guild.id, 'autoRole') || '',
    welcomeChannel: storage.get(guild.id, 'welcomeChannel') || '',
    ticketCategory: storage.get(guild.id, 'ticketCategory') || ''
  });
});

/**
 * POST /api/dashboard/settings
 */
router.post('/settings', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  const { autoRole, welcomeChannel, ticketCategory } = req.body;
  
  if (autoRole !== undefined) await storage.set(guild.id, 'autoRole', autoRole);
  if (welcomeChannel !== undefined) await storage.set(guild.id, 'welcomeChannel', welcomeChannel);
  if (ticketCategory !== undefined) await storage.set(guild.id, 'ticketCategory', ticketCategory);

  res.json({ success: true });
});

/**
 * GET /api/dashboard/users
 */
router.get('/users', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 40;
  const search = req.query.search || '';

  try {
    let members = [];
    if (search) {
      const searched = await guild.members.search({ query: search, limit });
      members = Array.from(searched.values());
    } else {
      const required = page * limit;
      if (guild.members.cache.size < required) {
        await guild.members.fetch({ limit: Math.max(200, required) });
      }
      members = Array.from(guild.members.cache.values());
    }

    members.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));
    const total = search ? members.length : guild.memberCount;
    const start = (page - 1) * limit;
    const paginated = members.slice(start, start + limit);

    const users = await Promise.all(paginated.map(async m => {
      const invData = await inviteManager.getUserData(guild.id, m.id);
      return {
        id: m.id,
        username: m.user.username,
        avatar: m.user.displayAvatarURL({ size: 64 }),
        joinedAt: m.joinedAt,
        invites: invData.regular + invData.bonus - invData.fake - invData.left
      };
    }));

    res.json({ users, pagination: { page, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/transcripts
 */
router.get('/transcripts', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    const results = await query('SELECT id, user, closed_at FROM transcripts WHERE guild_id = ? ORDER BY closed_at DESC', [guild.id]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/transcripts/:id
 */
router.get('/transcripts/:id', requireAuth, async (req, res) => {
  try {
    const results = await query('SELECT * FROM transcripts WHERE id = ?', [req.params.id]);
    if (results.length === 0) return res.status(404).json({ error: 'Transcript not found' });
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
