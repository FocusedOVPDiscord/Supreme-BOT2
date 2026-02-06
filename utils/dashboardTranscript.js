const { query } = require('./db');

/**
 * Saves a transcript to the TiDB database
 */
async function saveTranscriptToDashboard(guildId, ticketId, data) {
  try {
    await query(
      'INSERT INTO transcripts (id, guild_id, user, closed_at, messages) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE messages = ?',
      [ticketId, guildId, data.user, Date.now(), JSON.stringify(data.messages), JSON.stringify(data.messages)]
    );
    console.log(`[DASHBOARD TRANSCRIPT] Saved transcript for ticket ${ticketId} to TiDB`);
  } catch (error) {
    console.error('Error saving transcript to TiDB:', error);
  }
}

/**
 * Formats Discord messages for the dashboard transcript
 */
function formatMessagesForDashboard(messages) {
  return messages.map(m => ({
    author: m.author.username,
    content: m.content || (m.attachments.size > 0 ? '[Attachment]' : '[No content]'),
    timestamp: m.createdTimestamp
  })).reverse();
}

module.exports = {
  saveTranscriptToDashboard,
  formatMessagesForDashboard
};
