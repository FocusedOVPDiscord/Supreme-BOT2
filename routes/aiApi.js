const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');

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
 * Get selected guild or default
 */
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
 * GET /api/ai/status
 * Get Groq AI system status and stats
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    // Get AI enabled status
    const configResult = await query(
      'SELECT config_value FROM ai_config WHERE guild_id = ? AND config_key = ?',
      [guild.id, 'ai_enabled']
    );
    const enabled = configResult.length > 0 ? configResult[0].config_value === '1' : true;

    // Get stats from ai_conversations table
    const statsResult = await query(
      'SELECT COUNT(*) as total_messages, COUNT(DISTINCT user_id) as unique_users FROM ai_conversations WHERE channel_id LIKE ?',
      [`${guild.id}%`]
    );

    res.json({
      enabled,
      model: 'llama-3.3-70b-versatile',
      provider: 'Groq',
      stats: {
        totalMessages: statsResult[0]?.total_messages || 0,
        uniqueUsers: statsResult[0]?.unique_users || 0
      }
    });
  } catch (error) {
    console.error('AI status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/toggle
 * Toggle Groq AI system on/off
 */
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enabled value' });
    }

    await query(
      'INSERT INTO ai_config (guild_id, config_key, config_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = ?',
      [guild.id, 'ai_enabled', enabled ? '1' : '0', Date.now(), Date.now(), enabled ? '1' : '0', Date.now()]
    );

    res.json({ success: true, enabled });
  } catch (error) {
    console.error('AI toggle error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/memory
 * Get recent AI conversation history
 */
router.get('/memory', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const limit = parseInt(req.query.limit) || 50;
    
    const results = await query(
      `SELECT id, user_id, channel_id, role, content, created_at FROM ai_conversations WHERE channel_id LIKE ? ORDER BY created_at DESC LIMIT ${limit}`,
      [`${guild.id}%`]
    );

    const memory = results.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      channelId: entry.channel_id,
      role: entry.role,
      content: entry.content,
      timestamp: entry.created_at
    }));

    res.json(memory);
  } catch (error) {
    console.error('AI memory fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/memory/:id
 * Delete a specific conversation entry
 */
router.delete('/memory/:id', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const memoryId = parseInt(req.params.id);
    
    await query('DELETE FROM ai_conversations WHERE id = ? AND channel_id LIKE ?', [memoryId, `${guild.id}%`]);
    res.json({ success: true });
  } catch (error) {
    console.error('AI memory delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/memory/clear
 * Clear all conversation history for a specific user
 */
router.post('/memory/clear', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    await query('DELETE FROM ai_conversations WHERE user_id = ? AND channel_id LIKE ?', [userId, `${guild.id}%`]);
    res.json({ success: true });
  } catch (error) {
    console.error('AI memory clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/users
 * Get list of users who have interacted with Groq AI
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });
    
    const results = await query(
      'SELECT user_id, COUNT(*) as message_count, MAX(created_at) as last_interaction FROM ai_conversations WHERE channel_id LIKE ? GROUP BY user_id ORDER BY last_interaction DESC',
      [`${guild.id}%`]
    );

    const users = await Promise.all(results.map(async (row) => {
      try {
        const member = await guild.members.fetch(row.user_id).catch(() => null);
        return {
          userId: row.user_id,
          username: member ? member.user.username : 'Unknown User',
          avatar: member ? member.user.displayAvatarURL({ size: 64 }) : null,
          messageCount: row.message_count,
          lastInteraction: row.last_interaction
        };
      } catch {
        return {
          userId: row.user_id,
          username: 'Unknown User',
          avatar: null,
          messageCount: row.message_count,
          lastInteraction: row.last_interaction
        };
      }
    }));

    res.json(users);
  } catch (error) {
    console.error('AI users fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
