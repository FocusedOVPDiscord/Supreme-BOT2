# Groq AI Integration Setup

## Overview
Supreme Bot now includes Groq AI integration for automatic responses in ticket channels. The AI has conversation memory per user and provides helpful, professional responses.

## Features
- ✅ **Automatic responses** in ticket channels only
- ✅ **Per-user conversation memory** stored in TiDB
- ✅ **Smart context retention** (remembers last 10 messages per user)
- ✅ **Professional tone** with straight-to-the-point answers
- ✅ **Polite declines** for irrelevant/dangerous questions
- ✅ **Staff bypass** - AI doesn't respond to staff messages
- ✅ **Uses llama-3.3-70b-versatile** (fastest and smartest model)

## Setup Instructions

### 1. Get Groq API Key
1. Go to https://console.groq.com/keys
2. Sign up or log in
3. Create a new API key
4. Copy the API key

### 2. Add to Koyeb Environment Variables
1. Go to your Koyeb dashboard
2. Select your Supreme-bot2 service
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key
5. Save and redeploy

### 3. How It Works
- When a non-staff user sends a message in a ticket channel (e.g., `ticket-0001`)
- The AI automatically responds with helpful information
- Conversation history is saved per user in TiDB
- Staff messages are ignored (so staff can handle tickets manually)

## AI Behavior

### System Prompt
The AI is configured to:
- Answer questions directly and concisely
- Stay within the context of the question
- Politely decline inappropriate topics (politics, illegal content, etc.)
- Use a normal, professional tone
- Be helpful and courteous

### Staff Role IDs (AI ignores these)
- Test User: 982731220913913856
- Role 1: 958703198447755294
- Moderator: 1410661468688482314
- Senior MM: 1457664338163667072
- Founder: 1354402446994309123

## Database Schema
The AI uses the `ai_conversations` table in TiDB:
```sql
CREATE TABLE ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX idx_user_channel (user_id, channel_id),
    INDEX idx_created_at (created_at)
);
```

## Testing
1. Create a ticket using the `/setup-tickets` command
2. Send a message as a non-staff user
3. The AI should respond automatically
4. Send another message - it should remember the conversation context

## Troubleshooting

### AI not responding?
- Check if `GROQ_API_KEY` is set in Koyeb environment variables
- Check bot logs for errors: `[GROQ AI]`
- Verify you're in a ticket channel (name starts with `ticket-`)
- Verify you're not using a staff role

### AI responding to staff?
- Check the staff role IDs in `events/messageCreate.js`
- Make sure your role ID is in the `STAFF_ROLE_IDS` array

### Conversation not remembered?
- Check TiDB connection
- Verify `ai_conversations` table exists
- Check logs for database errors

## Cost Considerations
Groq offers generous free tier:
- 30 requests per minute
- 14,400 tokens per minute
- Perfect for ticket support use case

## Files Modified
- `utils/groqAI.js` - Main AI service
- `events/messageCreate.js` - Message handler with AI integration
- `index.js` - Database schema initialization
- `migrations/004_create_ai_conversations.sql` - Database migration
- `.env.example` - Environment variable documentation

## Support
For issues or questions, contact the bot administrator.
