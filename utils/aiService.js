const { init } = require('@heyputer/puter.js/src/init.cjs');
const { query } = require('./db');

// Initialize Puter.js for Node.js
// Note: Puter.js is free and doesn't require auth token for basic AI usage
const puter = init();

class AIService {
  constructor() {
    this.enabled = new Map(); // guildId -> boolean
    this.systemPrompt = `You are AI Ticket Bot, a helpful support assistant for Discord servers.

KNOWLEDGE & ANSWERING RULES:
- Questions that are too far/irrelevant/dangerous (e.g. sensitive politics, illegal content) - politely decline
- Just give the core answer, straight to the point without needing to provide additional answers outside the context
- Do NOT give summaries or extra explanations - only the direct answer
- Keep responses under 2000 characters (Discord limit)
- Use a friendly, professional tone`;
  }

  /**
   * Initialize AI service for a guild
   */
  async initialize(guildId) {
    try {
      const results = await query('SELECT enabled FROM ai_config WHERE guild_id = ?', [guildId]);
      if (results.length > 0) {
        this.enabled.set(guildId, results[0].enabled === 1);
      } else {
        // Default to disabled
        this.enabled.set(guildId, false);
        await query('INSERT INTO ai_config (guild_id, enabled) VALUES (?, ?)', [guildId, 0]);
      }
    } catch (error) {
      console.error('AI service initialization error:', error);
      this.enabled.set(guildId, false);
    }
  }

  /**
   * Check if AI is enabled for a guild
   */
  isEnabled(guildId) {
    return this.enabled.get(guildId) || false;
  }

  /**
   * Toggle AI on/off for a guild
   */
  async toggle(guildId, enabled) {
    try {
      await query('UPDATE ai_config SET enabled = ? WHERE guild_id = ?', [enabled ? 1 : 0, guildId]);
      this.enabled.set(guildId, enabled);
      return true;
    } catch (error) {
      console.error('AI toggle error:', error);
      return false;
    }
  }

  /**
   * Get conversation history for context
   */
  async getHistory(guildId, userId, limit = 10) {
    try {
      // TiDB doesn't support LIMIT with parameter binding, use hardcoded value
      const results = await query(
        `SELECT role, content, timestamp FROM ai_memory WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT ${parseInt(limit)}`,
        [guildId, userId]
      );
      return results.reverse().map(r => ({ role: r.role, content: r.content }));
    } catch (error) {
      console.error('AI history fetch error:', error);
      return [];
    }
  }

  /**
   * Save message to memory
   */
  async saveToMemory(guildId, userId, role, content) {
    try {
      await query(
        'INSERT INTO ai_memory (guild_id, user_id, role, content, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [guildId, userId, role, content]
      );
    } catch (error) {
      console.error('AI memory save error:', error);
    }
  }

  /**
   * Filter dangerous/inappropriate content
   */
  isDangerousQuery(content) {
    const dangerousPatterns = [
      /how to (make|build|create) (bomb|weapon|explosive)/i,
      /illegal (drug|substance|activity)/i,
      /hack(ing)? (account|password|system)/i,
      /steal(ing)? (credit card|identity|password)/i,
      /kill(ing)? (someone|people|person)/i,
      /suicide|self[- ]harm/i,
      /child (abuse|exploitation|pornography)/i,
      /terrorism|terrorist/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate AI response
   */
  async chat(guildId, userId, userMessage, channelContext = null) {
    if (!this.isEnabled(guildId)) {
      return null;
    }

    // Safety check
    if (this.isDangerousQuery(userMessage)) {
      return "I'm sorry, but I can't help with that request. If you need support, please ask a staff member.";
    }

    try {
      // Get conversation history
      const history = await this.getHistory(guildId, userId, 5);

      // Build conversation string for Puter.js
      let conversationText = this.systemPrompt + '\n\n';

      // Add channel context if provided
      if (channelContext) {
        conversationText += `Context: This is a support ticket. Channel: ${channelContext.channelName || 'ticket'}\n\n`;
      }

      // Add history
      if (history.length > 0) {
        conversationText += 'Previous conversation:\n';
        history.forEach(msg => {
          conversationText += `${msg.role}: ${msg.content}\n`;
        });
        conversationText += '\n';
      }

      // Add current message
      conversationText += `user: ${userMessage}\n\nassistant:`;

      // Call Puter AI with simple string format
      const response = await puter.ai.chat(conversationText, {
        model: 'gpt-4.1'
      });

      // Save to memory
      await this.saveToMemory(guildId, userId, 'user', userMessage);
      await this.saveToMemory(guildId, userId, 'assistant', response);

      return response;
    } catch (error) {
      console.error('AI chat error:', error);
      return 'Sorry, I encountered an error. Please try again or contact a staff member.';
    }
  }

  /**
   * Get all memory for a user
   */
  async getAllMemory(guildId, userId) {
    try {
      const results = await query(
        'SELECT id, role, content, timestamp FROM ai_memory WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC',
        [guildId, userId]
      );
      return results;
    } catch (error) {
      console.error('AI memory fetch error:', error);
      return [];
    }
  }

  /**
   * Delete specific memory entry
   */
  async deleteMemory(guildId, userId, memoryId) {
    try {
      await query('DELETE FROM ai_memory WHERE id = ? AND guild_id = ? AND user_id = ?', [memoryId, guildId, userId]);
      return true;
    } catch (error) {
      console.error('AI memory delete error:', error);
      return false;
    }
  }

  /**
   * Clear all memory for a user
   */
  async clearMemory(guildId, userId) {
    try {
      await query('DELETE FROM ai_memory WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      return true;
    } catch (error) {
      console.error('AI memory clear error:', error);
      return false;
    }
  }

  /**
   * Export memory as JSON
   */
  async exportMemory(guildId, userId) {
    const memory = await this.getAllMemory(guildId, userId);
    return JSON.stringify(memory, null, 2);
  }

  /**
   * Get memory stats
   */
  async getStats(guildId) {
    try {
      const results = await query(
        'SELECT COUNT(*) as total_messages, COUNT(DISTINCT user_id) as unique_users FROM ai_memory WHERE guild_id = ?',
        [guildId]
      );
      return results[0] || { total_messages: 0, unique_users: 0 };
    } catch (error) {
      console.error('AI stats error:', error);
      return { total_messages: 0, unique_users: 0 };
    }
  }
}

module.exports = new AIService();
