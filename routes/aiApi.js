const express = require('express');
const router = express.Router();
const aiService = require('../utils/aiService');

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
 * Get AI system status and stats
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    await aiService.initialize(guild.id);
    const stats = await aiService.getStats(guild.id);
    const enabled = aiService.isEnabled(guild.id);

    res.json({
      enabled,
      stats: {
        totalMessages: stats.total_messages,
        uniqueUsers: stats.unique_users
      }
    });
  } catch (error) {
    console.error('AI status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/toggle
 * Toggle AI system on/off
 */
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enabled value' });
    }

    await aiService.initialize(guild.id);
    const success = await aiService.toggle(guild.id, enabled);

    if (success) {
      res.json({ success: true, enabled });
    } else {
      res.status(500).json({ error: 'Failed to toggle AI' });
    }
  } catch (error) {
    console.error('AI toggle error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/memory
 * Get recent AI memory entries
 */
router.get('/memory', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const limit = parseInt(req.query.limit) || 50;
    const { query } = require('../utils/db');
    
    const results = await query(
      'SELECT ai_memory.*, users.username FROM ai_memory LEFT JOIN (SELECT DISTINCT user_id, MAX(timestamp) as last_seen FROM ai_memory GROUP BY user_id) as users ON ai_memory.user_id = users.user_id WHERE ai_memory.guild_id = ? ORDER BY ai_memory.timestamp DESC LIMIT ?',
      [guild.id, limit]
    );

    // Format results
    const memory = results.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      role: entry.role,
      content: entry.content,
      timestamp: entry.timestamp
    }));

    res.json(memory);
  } catch (error) {
    console.error('AI memory fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/memory/:id
 * Delete a specific memory entry
 */
router.delete('/memory/:id', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const memoryId = parseInt(req.params.id);
    const { query } = require('../utils/db');
    
    await query('DELETE FROM ai_memory WHERE id = ? AND guild_id = ?', [memoryId, guild.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('AI memory delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/memory/clear
 * Clear all memory for a specific user
 */
router.post('/memory/clear', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const success = await aiService.clearMemory(guild.id, userId);
    res.json({ success });
  } catch (error) {
    console.error('AI memory clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/users
 * Get list of users who have interacted with AI
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const guild = getSelectedGuild(req);
    if (!guild) return res.status(404).json({ error: 'No server selected' });

    const { query } = require('../utils/db');
    
    const results = await query(
      'SELECT user_id, COUNT(*) as message_count, MAX(timestamp) as last_interaction FROM ai_memory WHERE guild_id = ? GROUP BY user_id ORDER BY last_interaction DESC',
      [guild.id]
    );

    // Fetch Discord user info
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
