/**
 * AI Utility - Groq dependency removed.
 * AI features are currently disabled.
 */

module.exports = {
    generateResponse: async (query, context = "") => {
        // AI is disabled, returning null to allow the bot to fall back to other logic or staff.
        console.log('🤖 [AI] AI response requested but Groq is disabled.');
        return null;
    },
    checkHealth: async () => {
        // Always return true as there's no external service to check.
        return true;
    }
};
