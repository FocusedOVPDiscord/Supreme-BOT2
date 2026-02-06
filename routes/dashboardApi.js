const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/api/dashboard/auth/callback';
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
 * Get current authenticated user
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
 * Handle Discord OAuth2 callback
 */
router.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', {
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Discord
    const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const discordUser = userResponse.data;

    // Get user's guilds to check roles
    const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const userGuilds = guildsResponse.data;

    // Get user's roles in the bot's guild
    const client = req.app.locals.client;
    const botGuild = client.guilds.cache.first(); // Get the first guild the bot is in
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

    // Check if user has staff role
    const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));

    if (!isStaff) {
      return res.status(403).json({ 
        error: 'Access denied: You do not have permission to access this dashboard' 
      });
    }

    // Store user in session
    req.session.user = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      email: discordUser.email,
      roles: userRoles,
      isStaff: true,
      accessToken: access_token,
    };

    res.json({
      success: true,
      user: req.session.user,
    });
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

/**
 * POST /api/dashboard/auth/logout
 * Logout user
 */
router.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

/**
 * GET /api/dashboard/stats
 * Get overall server statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    // Get ticket count from settings
    const storage = require('../commands/utility/storage.js');
    const ticketCount = storage.get(guild.id, 'ticket_count') || 0;

    // Get giveaway count
    const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];

    const stats = {
      totalMembers: guild.memberCount,
      activeTickets: ticketCount,
      totalTrades: allGiveaways.length,
      uptime: Math.floor(process.uptime()),
      serverName: guild.name,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
      botStatus: client.isReady() ? 'Online' : 'Offline',
      recentTickets: [],
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/dashboard/tickets
 * Get list of tickets
 */
router.get('/tickets', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    // Get all channels in the ticket category
    const storage = require('../commands/utility/storage.js');
    const ticketCategoryId = '1458907554573844715'; // From CONFIG in interactionCreate.js

    const ticketChannels = guild.channels.cache.filter(
      channel => channel.parentId === ticketCategoryId && channel.isTextBased()
    );

    const tickets = [];
    for (const [, channel] of ticketChannels) {
      tickets.push({
        id: channel.id,
        name: channel.name,
        topic: channel.topic || 'No description',
        created: channel.createdTimestamp,
        createdAt: new Date(channel.createdTimestamp).toLocaleString(),
      });
    }

    res.json(tickets);
  } catch (error) {
    console.error('Tickets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/dashboard/tickets/:id
 * Get specific ticket details
 */
router.get('/tickets/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const channel = guild.channels.cache.get(id);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Fetch recent messages
    const messages = await channel.messages.fetch({ limit: 10 });

    res.json({
      id: channel.id,
      name: channel.name,
      topic: channel.topic,
      created: channel.createdTimestamp,
      messages: messages.map(msg => ({
        id: msg.id,
        author: msg.author.username,
        content: msg.content,
        timestamp: msg.createdTimestamp,
      })),
    });
  } catch (error) {
    console.error('Ticket fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

/**
 * POST /api/dashboard/tickets/:id/close
 * Close a specific ticket
 */
router.post('/tickets/:id/close', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const channel = guild.channels.cache.get(id);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Delete the channel
    await channel.delete('Ticket closed via dashboard');

    res.json({ success: true, message: 'Ticket closed successfully' });
  } catch (error) {
    console.error('Ticket close error:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

/**
 * GET /api/dashboard/users/:id
 * Get user profile and statistics
 */
router.get('/users/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invite stats
    const inviteManager = require('../inviteManager.js');
    const inviteStats = inviteManager.getUserData(guild.id, id);

    res.json({
      id: member.id,
      username: member.user.username,
      avatar: member.user.displayAvatarURL(),
      joinedAt: member.joinedTimestamp,
      roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
      invites: {
        regular: inviteStats.regular || 0,
        fake: inviteStats.fake || 0,
        bonus: inviteStats.bonus || 0,
        left: inviteStats.left || 0,
      },
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /api/dashboard/giveaways
 * Get list of giveaways
 */
router.get('/giveaways', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const storage = require('../commands/utility/storage.js');
    const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];

    const giveaways = [];
    for (const giveawayId of allGiveaways) {
      const giveawayKey = `giveaway_${giveawayId}`;
      const participants = storage.get(guild.id, giveawayKey) || [];

      giveaways.push({
        id: giveawayId,
        participants: participants.length,
      });
    }

    res.json(giveaways);
  } catch (error) {
    console.error('Giveaways fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch giveaways' });
  }
});

/**
 * POST /api/dashboard/giveaways/create
 * Create a new giveaway
 */
router.post('/giveaways/create', requireStaff, async (req, res) => {
  try {
    const { prize, duration, winners, channel } = req.body;

    if (!prize || !duration || !winners || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    res.json({ success: true, message: 'Giveaway creation not yet implemented via API' });
  } catch (error) {
    console.error('Giveaway create error:', error);
    res.status(500).json({ error: 'Failed to create giveaway' });
  }
});

/**
 * GET /api/dashboard/settings
 * Get bot configuration settings
 */
router.get('/settings', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const storage = require('../commands/utility/storage.js');
    const welcomeConfig = storage.get(guild.id, 'welcome_config') || {};
    const autoRoleId = storage.get(guild.id, 'autoRoleId') || null;

    res.json({
      welcome: welcomeConfig,
      autoRole: autoRoleId,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * POST /api/dashboard/settings
 * Update bot configuration settings
 */
router.post('/settings', requireStaff, async (req, res) => {
  try {
    const settings = req.body;
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    const storage = require('../commands/utility/storage.js');

    if (settings.welcome) {
      storage.set(guild.id, 'welcome_config', settings.welcome);
    }

    if (settings.autoRole) {
      storage.set(guild.id, 'autoRoleId', settings.autoRole);
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/dashboard/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', requireStaff, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();

    if (!guild) {
      return res.status(500).json({ error: 'Bot not in any guild' });
    }

    // Fetch audit logs from Discord
    const auditLogs = await guild.fetchAuditLogs({ limit: 50 });

    const logs = auditLogs.entries.map(log => ({
      id: log.id,
      action: log.action,
      executor: log.executor?.username || 'Unknown',
      target: log.target?.username || log.targetId || 'Unknown',
      reason: log.reason || 'No reason',
      timestamp: log.createdTimestamp,
      createdAt: new Date(log.createdTimestamp).toLocaleString(),
    }));

    res.json(logs);
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
