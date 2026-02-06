const express = require('express');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');
const fs = require('fs');
const path = require('path');
const { getPath } = require('../pathConfig');
const { saveTranscriptToDashboard, formatMessagesForDashboard } = require('../utils/dashboardTranscript');

const TRANSCRIPTS_FILE = getPath('transcripts.json');

function loadTranscripts() {
  try {
    if (fs.existsSync(TRANSCRIPTS_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSCRIPTS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading transcripts:', error);
  }
  return {};
}

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/dashboard/login';
const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314'];

// Trusted IPs storage
const TRUSTED_IPS_FILE = path.join(__dirname, '..', 'data', 'trusted-ips.json');

// Load trusted IPs
function loadTrustedIPs() {
  try {
    if (fs.existsSync(TRUSTED_IPS_FILE)) {
      return JSON.parse(fs.readFileSync(TRUSTED_IPS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading trusted IPs:', error);
  }
  return {};
}

// Save trusted IPs
function saveTrustedIPs(trustedIPs) {
  try {
    fs.writeFileSync(TRUSTED_IPS_FILE, JSON.stringify(trustedIPs, null, 2));
  } catch (error) {
    console.error('Error saving trusted IPs:', error);
  }
}

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
router.get('/auth/me', async (req, res) => {
  // Check if user has valid session
  if (req.session && req.session.user) {
    return res.json(req.session.user);
  }
  
  // Check if IP is trusted for auto-login
  const clientIP = getClientIP(req);
  const trustedIPs = loadTrustedIPs();
  
  if (trustedIPs[clientIP]) {
    const trustedUser = trustedIPs[clientIP];
    
    // Verify user still has staff role
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    
    if (guild) {
      try {
        const member = await guild.members.fetch(trustedUser.id).catch(() => null);
        if (member) {
          const userRoles = member.roles.cache.map(role => role.id);
          const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));
          
          if (isStaff) {
            // Auto-login user
            req.session.user = {
              id: trustedUser.id,
              username: trustedUser.username,
              avatar: trustedUser.avatar,
              roles: userRoles,
              isStaff: true
            };
            
            console.log(`✅ Auto-login successful for ${trustedUser.username} from IP ${clientIP}`);
            return res.json(req.session.user);
          }
        }
      } catch (error) {
        console.error('Auto-login verification failed:', error);
      }
    }
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
    
    // Save IP as trusted
    const clientIP = getClientIP(req);
    const trustedIPs = loadTrustedIPs();
    trustedIPs[clientIP] = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      lastLogin: new Date().toISOString()
    };
    saveTrustedIPs(trustedIPs);
    
    console.log(`✅ Login successful for ${discordUser.username} from IP ${clientIP} (saved as trusted)`);

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
  const clientIP = getClientIP(req);
  const removeTrustedIP = req.body.removeTrustedIP || false;
  
  // Optionally remove IP from trusted list
  if (removeTrustedIP) {
    const trustedIPs = loadTrustedIPs();
    delete trustedIPs[clientIP];
    saveTrustedIPs(trustedIPs);
    console.log(`🔒 Removed trusted IP: ${clientIP}`);
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
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const userRoles = member.roles.cache.map(role => role.id);
          const isStaff = userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId));
          
          if (isStaff) {
            guilds.push({
              id: guild.id,
              name: guild.name,
              icon: guild.iconURL(),
              memberCount: guild.memberCount
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching guild ${guildId}:`, error);
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
router.post('/select-guild', requireAuth, (req, res) => {
  try {
    const { guildId } = req.body;
    const client = req.app.locals.client;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    req.session.selectedGuildId = guildId;
    console.log(`✅ User ${req.session.user.username} selected guild: ${guild.name}`);
    
    res.json({ success: true, guild: { id: guild.id, name: guild.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/guild-data
 * Returns roles and channels for the selected guild
 */
router.get('/guild-data', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const roles = guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    const channels = guild.channels.cache
      .filter(c => c.type === 0) // Text channels
      .map(c => ({ id: c.id, name: c.name }));

    res.json({ roles, channels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(500).json({ error: 'Bot not in guild' });

    const ticketCategoryId = storage.get(guild.id, 'ticketCategoryId') || '1458907554573844715';
    const activeTickets = guild.channels.cache.filter(c => c.parentId === ticketCategoryId).size;
    
    const transcripts = loadTranscripts();
    const guildTranscripts = transcripts[guild.id] || [];
    const closedTicketsCount = guildTranscripts.length;

    // Accurate uptime calculation
    const uptimeSeconds = Math.floor(process.uptime());

    res.json({
      totalMembers: guild.memberCount,
      activeTickets: activeTickets,
      closedTickets: closedTicketsCount,
      uptime: uptimeSeconds,
      serverName: guild.name,
      channels: guild.channels.cache.filter(c => c.type !== 4).size, // Exclude categories
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
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    
    const ticketCategoryId = storage.get(guild.id, 'ticketCategoryId') || '1458907554573844715';
    
    const tickets = guild.channels.cache
      .filter(c => c.parentId === ticketCategoryId)
      .map(c => ({
        id: c.id,
        user: c.name.replace('ticket-', ''),
        status: 'open',
        created: new Date(c.createdTimestamp).toLocaleDateString()
      }));

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/tickets/:id/messages
 */
router.get('/tickets/:id/messages', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const channel = guild.channels.cache.get(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Ticket not found' });

    const messages = await channel.messages.fetch({ limit: 100 });
    const formattedMessages = messages.map(m => ({
      id: m.id,
      author: {
        username: m.author.username,
        avatar: m.author.displayAvatarURL(),
        bot: m.author.bot
      },
      content: m.content,
      timestamp: m.createdTimestamp,
      attachments: m.attachments.map(a => a.url)
    })).reverse();

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/dashboard/tickets/:id
 */
router.delete('/tickets/:id', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const channel = guild.channels.cache.get(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Ticket not found' });

    // Save transcript before deleting
    const messages = await channel.messages.fetch({ limit: 100 });
    
    saveTranscriptToDashboard(guild.id, channel.id, {
      user: channel.name.replace('ticket-', ''),
      messages: formatMessagesForDashboard(messages)
    });

    await channel.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/transcripts
 */
router.get('/transcripts', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const transcripts = loadTranscripts();
    res.json(transcripts[guild.id] || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/users/:id/moderate
 */
router.post('/users/:id/moderate', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { action, reason } = req.body;
    const targetId = req.params.id;
    const member = await guild.members.fetch(targetId).catch(() => null);

    if (!member && action !== 'ban') {
      return res.status(404).json({ error: 'Member not found in server' });
    }

    const moderator = req.session.user.username;

    switch (action) {
      case 'ban':
        await guild.members.ban(targetId, { reason: `Moderator: ${moderator} | Reason: ${reason}` });
        break;
      case 'kick':
        await member.kick(`Moderator: ${moderator} | Reason: ${reason}`);
        break;
      case 'mute':
        // Mute for 24 hours by default if no duration
        await member.timeout(24 * 60 * 60 * 1000, `Moderator: ${moderator} | Reason: ${reason}`);
        break;
      case 'warn':
        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Professional Warning')
          .setDescription(`You have received a warning in **${guild.name}**.`)
          .addFields(
            { name: 'Reason', value: reason || 'No reason provided' },
            { name: 'Moderator', value: moderator }
          )
          .setColor('#FFA500')
          .setTimestamp()
          .setFooter({ text: 'Supreme Management System' });
        
        await member.send({ embeds: [warnEmbed] }).catch(() => {
          throw new Error('Could not send DM to user, but warning logged.');
        });
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, message: `User ${action}ned successfully` });
  } catch (error) {
    console.error(`Moderation error (${req.body.action}):`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/users
 */
router.get('/users', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const search = req.query.search || '';
    
    let membersArray = [];
    
    try {
      if (search) {
        // If searching, we use query to find specific members
        const searchedMembers = await guild.members.search({ query: search, limit: 100 });
        membersArray = Array.from(searchedMembers.values());
      } else {
        // Use cache by default to avoid Gateway rate limits (Opcode 8)
        // Only fetch if cache is absolutely empty
        if (guild.members.cache.size === 0 && guild.memberCount > 0) {
          console.log(`[DASHBOARD] Cache empty. Fetching members for ${guild.name}...`);
          // Use a smaller fetch or just rely on what we can get to avoid rate limits
          const fetchedMembers = await guild.members.fetch({ limit: 1000 }).catch(() => guild.members.cache);
          membersArray = Array.from(fetchedMembers.values());
        } else {
          membersArray = Array.from(guild.members.cache.values());
        }
      }
    } catch (fetchError) {
      console.error('[DASHBOARD] Member fetch error:', fetchError);
      membersArray = Array.from(guild.members.cache.values());
    }

    // Sort by join date (newest first)
    membersArray.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));

    const total = membersArray.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginatedMembers = membersArray.slice(start, end);

    const users = paginatedMembers.map(m => {
      const invData = inviteManager.getUserData(guild.id, m.id);
      return {
        id: m.id,
        username: m.user.username,
        avatar: m.user.displayAvatarURL(),
        invites: (invData.regular || 0) + (invData.bonus || 0) - (invData.left || 0),
        joinedAt: new Date(m.joinedTimestamp).toLocaleDateString()
      };
    });

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/giveaways
 */
router.get('/giveaways', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
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
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    res.json({
      welcomeChannel: storage.get(guild.id, 'welcomeChannel'),
      autoRole: storage.get(guild.id, 'autoRoleId'),
      ticketCategory: storage.get(guild.id, 'ticketCategoryId') || '1458907554573844715'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/settings
 */
router.post('/settings', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { autoRole, welcomeChannel, ticketCategory } = req.body;

    if (autoRole !== undefined) storage.set(guild.id, 'autoRoleId', autoRole);
    if (welcomeChannel !== undefined) storage.set(guild.id, 'welcomeChannel', welcomeChannel);
    if (ticketCategory !== undefined) storage.set(guild.id, 'ticketCategoryId', ticketCategory);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/audit-logs
 */
router.get('/audit-logs', requireStaff, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
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
