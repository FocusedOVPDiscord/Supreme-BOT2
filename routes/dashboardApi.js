const express = require('express');
const axios = require('axios');
const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');
const { query } = require('../utils/db');
const { saveTranscriptToDashboard, formatMessagesForDashboard } = require('../utils/dashboardTranscript');

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1459183931005075701';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '2HFpZf8paKaxZnSfuhbAFr4nx8hn-ymg';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://breakable-tiger-supremebot1-d8a3b39c.koyeb.app/dashboard/login';
const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];

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

  const activeTicketsData = storage.get(guild.id, 'active_tickets') || {};
  const activeTicketsCount = Object.keys(activeTicketsData).length;
  
  // Count closed tickets from database
  let closedTicketsCount = 0;
  try {
    const results = await query('SELECT COUNT(*) as count FROM transcripts WHERE guild_id = ?', [guild.id]);
    closedTicketsCount = results[0]?.count || 0;
  } catch (e) { /* ignore */ }

  let recentTickets = Object.values(activeTicketsData)
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 5);

  res.json({
    serverName: guild.name,
    totalMembers: guild.memberCount,
    onlineMembers: guild.members.cache.filter(m => m.presence?.status === 'online').size,
    boostCount: guild.premiumSubscriptionCount || 0,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    uptime: process.uptime(),
    botStatus: 'Online',
    activeTickets: activeTicketsCount,
    closedTickets: closedTicketsCount,
    recentTickets: recentTickets
  });
});

/**
 * GET /api/dashboard/tickets
 */
router.get('/tickets', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    await guild.channels.fetch();
    
    const ticketChannels = guild.channels.cache.filter(c => 
      c.type === ChannelType.GuildText && 
      c.name && 
      c.name.startsWith('ticket-')
    );

    const activeTickets = ticketChannels.map(channel => {
      const ticketNumber = channel.name.replace('ticket-', '');
      
      const creatorOverwrite = channel.permissionOverwrites.cache.find(p => 
        p.type === 1 &&
        !STAFF_ROLE_IDS.includes(p.id) && 
        p.id !== guild.client.user.id
      );
      
      const creatorId = creatorOverwrite ? creatorOverwrite.id : 'Unknown';
      const creator = guild.members.cache.get(creatorId);
      
      return {
        id: channel.id,
        ticketNumber: ticketNumber,
        user: creator ? creator.user.username : 'Unknown User',
        userId: creatorId,
        status: 'Active',
        created: channel.createdAt,
        channelName: channel.name
      };
    });

    activeTickets.sort((a, b) => b.ticketNumber.localeCompare(a.ticketNumber));

    res.json(activeTickets);
  } catch (error) {
    console.error('Error fetching active tickets:', error);
    res.status(500).json({ error: 'Failed to fetch active tickets' });
  }
});

/**
 * GET /api/dashboard/tickets/:id/messages
 */
router.get('/tickets/:id/messages', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    const channel = await guild.channels.fetch(req.params.id).catch(() => null);
    if (!channel) return res.status(404).json({ error: 'Ticket channel not found' });

    const messages = await channel.messages.fetch({ limit: 100 });
    const formatted = messages.map(m => ({
      id: m.id,
      author: {
        username: m.author.username,
        avatar: m.author.displayAvatarURL(),
        bot: m.author.bot
      },
      content: m.content,
      timestamp: m.createdTimestamp,
      embeds: m.embeds.map(e => ({ title: e.title, description: e.description })),
      attachments: Array.from(m.attachments.values()).map(a => a.url)
    }));

    res.json(formatted.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/dashboard/tickets/:id
 */
router.delete('/tickets/:id', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    const channel = await guild.channels.fetch(req.params.id).catch(() => null);
    if (channel) {
      await channel.delete();
    }
    
    const activeTickets = storage.get(guild.id, 'active_tickets') || {};
    if (activeTickets[req.params.id]) {
      delete activeTickets[req.params.id];
      await storage.set(guild.id, 'active_tickets', activeTickets);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

  const welcomeConfig = storage.get(guild.id, 'welcome_config') || {};

  res.json({
    autoRole: storage.get(guild.id, 'autoRoleId') || '',
    welcomeChannel: welcomeConfig.channelId || '',
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
  
  if (autoRole !== undefined) await storage.set(guild.id, 'autoRoleId', autoRole);
  
  if (welcomeChannel !== undefined) {
    const welcomeConfig = storage.get(guild.id, 'welcome_config') || {};
    welcomeConfig.channelId = welcomeChannel;
    await storage.set(guild.id, 'welcome_config', welcomeConfig);
  }
  
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

    const totalPages = Math.ceil(total / limit);
    res.json({ 
      users, 
      pagination: { 
        page, 
        total, 
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/users/:id/moderate
 */
router.post('/users/:id/moderate', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  const { action, reason } = req.body;
  const targetId = req.params.id;

  try {
    const member = await guild.members.fetch(targetId).catch(() => null);
    if (!member && action !== 'ban') return res.status(404).json({ error: 'Member not found' });

    switch (action) {
      case 'warn':
        await member.send(`⚠️ You have been warned in **${guild.name}**\n**Reason:** ${reason}`).catch(() => null);
        break;
      case 'mute':
        await member.timeout(24 * 60 * 60 * 1000, reason);
        break;
      case 'kick':
        await member.kick(reason);
        break;
      case 'ban':
        await guild.members.ban(targetId, { reason });
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true });
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
    const results = await query('SELECT id, user, closed_at, messages FROM transcripts WHERE guild_id = ? ORDER BY closed_at DESC', [guild.id]);
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

/**
 * GET /api/dashboard/audit-logs
 */
router.get('/audit-logs', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 50 });
    const formatted = auditLogs.entries.map(entry => ({
      id: entry.id,
      executor: entry.executor ? entry.executor.username : 'Unknown',
      executorAvatar: entry.executor ? entry.executor.displayAvatarURL({ size: 64 }) : null,
      action: AUDIT_ACTION_NAMES[entry.action] || `Action #${entry.action}`,
      actionRaw: entry.action,
      target: entry.target ? (entry.target.username || entry.target.name || entry.targetId) : 'N/A',
      reason: entry.reason || null,
      timestamp: entry.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/giveaways
 */
router.get('/giveaways', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  try {
    const allGiveawayIds = storage.get(guild.id, 'all_giveaways') || [];
    const giveaways = allGiveawayIds.map(msgId => {
      const participants = storage.get(guild.id, `giveaway_${msgId}`) || [];
      const meta = storage.get(guild.id, `giveaway_meta_${msgId}`) || {};
      
      const now = Math.floor(Date.now() / 1000);
      let status = meta.status || 'active';
      if (status === 'active' && meta.endTime && now > meta.endTime) {
        status = 'ended';
      }

      return {
        id: msgId,
        prize: meta.prize || `Giveaway #${msgId.slice(-6)}`,
        winnersCount: meta.winnersCount || 1,
        hostTag: meta.hostTag || 'Unknown',
        hostId: meta.hostId || null,
        channelId: meta.channelId || null,
        endTime: meta.endTime || null,
        createdAt: meta.createdAt || null,
        participants: participants.length,
        winners: meta.winners || [],
        status: status
      };
    });

    // Sort: active first, then by creation time descending
    giveaways.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    res.json(giveaways);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/giveaways/:id/end
 */
router.post('/giveaways/:id/end', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  const messageId = req.params.id;
  const giveawayId = `giveaway_${messageId}`;
  const participants = storage.get(guild.id, giveawayId);

  if (!participants) {
    return res.status(404).json({ error: 'Giveaway not found' });
  }

  try {
    const meta = storage.get(guild.id, `giveaway_meta_${messageId}`) || {};
    const channelId = meta.channelId;
    
    if (channelId) {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message && message.components.length > 0) {
          const prize = meta.prize || 'Giveaway';
          const winnersCount = meta.winnersCount || 1;
          
          const winners = [];
          if (participants.length > 0) {
            const shuffled = [...participants].sort(() => 0.5 - Math.random());
            winners.push(...shuffled.slice(0, Math.min(winnersCount, participants.length)));
          }

          const winnerMentions = winners.length > 0 
            ? winners.map(id => `<@${id}>`).join(', ') 
            : 'No participants';

          const dot = '<:dot:1460754381447237785>';
          const timestamp = Math.floor(Date.now() / 1000);

          const endEmbed = new EmbedBuilder()
            .setTitle(prize)
            .setColor('#2F3136')
            .setDescription(
              `${dot} **Ended**: <t:${timestamp}:R> (<t:${timestamp}:F>)\n` +
              `${dot} **Hosted by**: <@${meta.hostId}>\n` +
              `${dot} **Participants**: **${participants.length}**\n` +
              `${dot} **Winners**: ${winnerMentions}`
            )
            .setTimestamp();

          await message.edit({ embeds: [endEmbed], components: [] });

          if (winners.length > 0) {
            await channel.send(`🎉 Congratulations ${winnerMentions}! You won the **${prize}**!`);
          }

          meta.status = 'ended';
          meta.winners = winners;
          meta.participantCount = participants.length;
          await storage.set(guild.id, `giveaway_meta_${messageId}`, meta);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending giveaway from dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/dashboard/giveaways/:id
 */
router.delete('/giveaways/:id', requireAuth, async (req, res) => {
  const guild = getSelectedGuild(req);
  if (!guild) return res.status(404).json({ error: 'No server selected' });

  const messageId = req.params.id;

  try {
    const meta = storage.get(guild.id, `giveaway_meta_${messageId}`) || {};
    
    // Try to delete the Discord message
    if (meta.channelId) {
      const channel = await guild.channels.fetch(meta.channelId).catch(() => null);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) await message.delete().catch(() => null);
      }
    }

    // Clean up all storage
    storage.set(guild.id, `giveaway_${messageId}`, undefined);
    storage.set(guild.id, `giveaway_meta_${messageId}`, undefined);
    
    const allGiveaways = storage.get(guild.id, 'all_giveaways') || [];
    const filtered = allGiveaways.filter(id => id !== messageId);
    await storage.set(guild.id, 'all_giveaways', filtered);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
