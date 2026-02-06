const fs = require('fs');
const path = require('path');
const { getPath } = require('../pathConfig');

const TRANSCRIPTS_FILE = getPath('transcripts.json');

/**
 * Loads all transcripts from the storage file
 */
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

/**
 * Saves a transcript to the dashboard database
 * @param {string} guildId - The ID of the guild
 * @param {string} ticketId - The ID of the ticket channel
 * @param {Object} data - Transcript data (user, messages)
 */
function saveTranscriptToDashboard(guildId, ticketId, data) {
  try {
    const transcripts = loadTranscripts();
    if (!transcripts[guildId]) transcripts[guildId] = [];
    
    // Avoid duplicate transcripts for the same ticket
    const exists = transcripts[guildId].some(t => t.id === ticketId);
    if (exists) return;

    transcripts[guildId].push({
      id: ticketId,
      closedAt: Date.now(),
      ...data
    });
    
    fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify(transcripts, null, 2));
    console.log(`[DASHBOARD TRANSCRIPT] Saved transcript for ticket ${ticketId} in guild ${guildId}`);
  } catch (error) {
    console.error('Error saving transcript to dashboard:', error);
  }
}

/**
 * Formats Discord messages for the dashboard transcript
 * @param {Collection} messages - Discord.js message collection
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
