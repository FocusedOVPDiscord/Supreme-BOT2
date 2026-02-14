const Groq = require('groq-sdk');
const { query } = require('./db');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// System prompt for the AI
const SYSTEM_PROMPT = `You are a helpful AI assistant for Supreme Middleman Services (SMMP).

Your guidelines:
- Answer questions directly and concisely, straight to the point
- Stay within the context of the question asked
- Politely decline questions that are:
  * Too far from the topic or irrelevant
  * About sensitive politics
  * Requesting illegal content or dangerous information
- Use a normal, professional tone
- Be helpful and courteous

When declining inappropriate questions, simply say: "I apologize, but I cannot assist with that topic. Please ask questions related to our services or general assistance."`;

const MODEL = 'llama-3.3-70b-versatile'; // Fastest and smartest
const MAX_HISTORY = 10; // Remember last 10 messages per user

/**
 * Get conversation history for a user in a channel
 */
async function getConversationHistory(userId, channelId) {
    try {
        const results = await query(
            `SELECT role, content FROM ai_conversations 
             WHERE user_id = ? AND channel_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, channelId, MAX_HISTORY]
        );
        
        // Reverse to get chronological order
        return results.reverse().map(row => ({
            role: row.role,
            content: row.content
        }));
    } catch (error) {
        console.error('[GROQ AI] Error fetching conversation history:', error);
        return [];
    }
}

/**
 * Save a message to conversation history
 */
async function saveMessage(userId, channelId, role, content) {
    try {
        await query(
            'INSERT INTO ai_conversations (user_id, channel_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
            [userId, channelId, role, content, Date.now()]
        );
        
        // Clean up old messages (keep only last 20 per user/channel)
        await query(
            `DELETE FROM ai_conversations 
             WHERE user_id = ? AND channel_id = ? 
             AND id NOT IN (
                 SELECT id FROM (
                     SELECT id FROM ai_conversations 
                     WHERE user_id = ? AND channel_id = ? 
                     ORDER BY created_at DESC 
                     LIMIT 20
                 ) AS recent
             )`,
            [userId, channelId, userId, channelId]
        );
    } catch (error) {
        console.error('[GROQ AI] Error saving message:', error);
    }
}

/**
 * Clear conversation history for a user in a channel
 */
async function clearHistory(userId, channelId) {
    try {
        await query(
            'DELETE FROM ai_conversations WHERE user_id = ? AND channel_id = ?',
            [userId, channelId]
        );
        return true;
    } catch (error) {
        console.error('[GROQ AI] Error clearing history:', error);
        return false;
    }
}

/**
 * Generate AI response with conversation memory
 */
async function generateResponse(userId, channelId, userMessage) {
    try {
        // Get conversation history
        const history = await getConversationHistory(userId, channelId);
        
        // Build messages array
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: userMessage }
        ];
        
        // Call Groq API
        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });
        
        const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
        
        // Save both user message and AI response to history
        await saveMessage(userId, channelId, 'user', userMessage);
        await saveMessage(userId, channelId, 'assistant', aiResponse);
        
        return aiResponse;
    } catch (error) {
        console.error('[GROQ AI] Error generating response:', error);
        
        if (error.message?.includes('API key')) {
            return '❌ AI service is not configured. Please contact an administrator.';
        }
        
        return '❌ I encountered an error processing your request. Please try again.';
    }
}

/**
 * Check if Groq API is configured
 */
function isConfigured() {
    return !!process.env.GROQ_API_KEY;
}

module.exports = {
    generateResponse,
    clearHistory,
    isConfigured,
    getConversationHistory
};
