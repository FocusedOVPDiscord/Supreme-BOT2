const express = require('express');
const axios = require('axios');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/dashboard/login';
const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314'];

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
 * Middleware to check if user has staff role
 */
const requireStaff = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRoles = req.session.user.roles || [];
  const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));

  if (!isStaff) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  next();
};

/**
 * GET /api/dashboard/auth/me
 */
router.get('/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
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
      try {
        const member = await botGuild.members.fetch(discordUser.id).catch(() => null);
        if (member) {
          userRoles = member.roles.cache.map(role => role.id);
        }
      } catch (error) {
        console.error('Failed to fetch member roles:', error);
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

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/dashboard/auth/logout
 */
router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    if (!guild) return res.status(500).json({ error: 'Bot not in guild' });

    const ticketCategoryId = '1458907554573844715';
    const activeTickets = guild.channels.cache.filter(c => c.parentId === ticketCategoryId).size;
    const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];

    res.json({
      totalMembers: guild.memberCount,
      activeTickets: activeTickets,
      totalTrades: allGiveaways.length,
      uptime: Math.floor(process.uptime()),
      serverName: guild.name,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
      botStatus: 'Online',
      recentTickets: guild.channels.cache
        .filter(c => c.parentId === ticketCategoryId)
        .first(5)
        .map(c => ({ id: c.id, title: c.name, status: 'open' }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/tickets
 */
router.get('/tickets', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    const ticketCategoryId = '1458907554573844715';
    
    const tickets = guild.channels.cache
      .filter(c => c.parentId === ticketCategoryId)
      .map(c => ({
        id: c.id,
        user: c.name.split('-')[1] || 'Unknown',
        status: 'open',
        created: new Date(c.createdTimestamp).toLocaleDateString()
      }));

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/users
 */
router.get('/users', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    const members = await guild.members.fetch({ limit: 50 });
    
    const users = members.map(m => {
      const invData = inviteManager.getUserData(guild.id, m.id);
      return {
        id: m.id,
        username: m.user.username,
        avatar: m.user.displayAvatarURL(),
        invites: (invData.regular || 0) + (invData.bonus || 0) - (invData.left || 0),
        joinedAt: new Date(m.joinedTimestamp).toLocaleDateString()
      };
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/giveaways
 */
router.get('/giveaways', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];
    
    const giveaways = allGiveaways.map(id => {
      const data = storage.get(guild.id, `giveaway_${id}`) || [];
      return { id, participants: data.length, status: 'Active' };
    });

    res.json(giveaways);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/settings
 */
router.get('/settings', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    res.json({
      welcomeChannel: storage.get(guild.id, 'welcomeChannel'),
      autoRole: storage.get(guild.id, 'autoRoleId'),
      ticketCategory: '1458907554573844715'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/audit-logs
 */
router.get('/audit-logs', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    const logs = await guild.fetchAuditLogs({ limit: 20 });
    
    res.json(logs.entries.map(l => ({
      id: l.id,
      action: l.action,
      executor: l.executor.username,
      target: l.target?.username || 'System',
      timestamp: new Date(l.createdTimestamp).toLocaleString()
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
