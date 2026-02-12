const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('./db');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIService {
  constructor() {
    this.enabled = new Map(); // guildId -> boolean
    this.systemPrompt = `You are Supreme AI, a helpful support assistant for Discord servers.

KNOWLEDGE & ANSWERING RULES:
- Questions that are too far/irrelevant/dangerous (e.g. sensitive politics, illegal content) - politely decline
- Just give the core answer, straight to the point without needing to provide additional answers outside the context
- Do NOT give summaries or extra explanations - only the direct answer
- Keep responses under 1900 characters (Discord limit)
- Use a friendly, professional tone
- If asked who you are, say you are Supreme AI, a smart assistant built into this Discord server`;
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
        this.enabled.set(guildId, false);
        await query('INSERT INTO ai_config (guild_id, enabled, created_at, updated_at) VALUES (?, ?, ?, ?)', [guildId, 0, Date.now(), Date.now()]);
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
      const results = await query('SELECT guild_id FROM ai_config WHERE guild_id = ?', [guildId]);
      if (results.length > 0) {
        await query('UPDATE ai_config SET enabled = ?, updated_at = ? WHERE guild_id = ?', [enabled ? 1 : 0, Date.now(), guildId]);
      } else {
        await query('INSERT INTO ai_config (guild_id, enabled, created_at, updated_at) VALUES (?, ?, ?, ?)', [guildId, enabled ? 1 : 0, Date.now(), Date.now()]);
      }
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
      const safeLimit = parseInt(limit) || 10;
      const results = await query(
        `SELECT role, content, created_at FROM ai_memory WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [guildId, userId]
      );
      return results.reverse().map(r => ({ role: r.role, content: r.content }));
    } catch (error) {
      console.error('AI history fetch error:', error);
      return [];
    }
  }

  /**
   * Save message to memory - uses BIGINT timestamp for TiDB compatibility
   */
  async saveToMemory(guildId, userId, role, content) {
    try {
      await query(
        'INSERT INTO ai_memory (guild_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [String(guildId), String(userId), String(role), String(content), Date.now()]
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
   * Generate AI response using Google Gemini
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
      // Get conversation history from DB
      const history = await this.getHistory(guildId, userId, 10);

      // Build the prompt with context
      let contextPrompt = this.systemPrompt + '\n\n';

      // Add channel context if provided (e.g. ticket channel)
      if (channelContext) {
        contextPrompt += `Context: This is a support ticket channel. Channel: ${channelContext.channelName || 'ticket'}\n\n`;
      }

      // Add conversation history
      if (history.length > 0) {
        contextPrompt += 'Previous conversation:\n';
        history.forEach(msg => {
          const label = msg.role === 'user' ? 'User' : 'Assistant';
          contextPrompt += `${label}: ${msg.content}\n`;
        });
        contextPrompt += '\n';
      }

      // Add current message
      contextPrompt += `User: ${userMessage}\n\nAssistant:`;

      // Call Gemini API
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const result = await model.generateContent(contextPrompt);
      const response = result.response;
      const responseText = response.text();

      if (!responseText) {
        return 'Sorry, I could not generate a response. Please try again.';
      }

      // Trim to Discord limit
      const trimmedResponse = responseText.length > 1900 
        ? responseText.substring(0, 1900) + '...' 
        : responseText;

      // Save to memory
      await this.saveToMemory(guildId, userId, 'user', userMessage);
      await this.saveToMemory(guildId, userId, 'assistant', trimmedResponse);

      return trimmedResponse;
    } catch (error) {
      console.error('AI chat error:', error);
      if (error.message && error.message.includes('RATE_LIMIT')) {
        return 'I\'m a bit busy right now. Please try again in a moment.';
      }
      return 'Sorry, I encountered an error. Please try again or contact a staff member.';
    }
  }

  /**
   * Get all memory for a user
   */
  async getAllMemory(guildId, userId) {
    try {
      const results = await query(
        'SELECT id, role, content, created_at FROM ai_memory WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
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
