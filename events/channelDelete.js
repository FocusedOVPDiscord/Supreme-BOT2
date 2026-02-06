const { Events } = require('discord.js');
const { saveTranscriptToDashboard, formatMessagesForDashboard } = require('../utils/dashboardTranscript');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        // Only process ticket channels
        if (!channel.name || !channel.name.startsWith('ticket-')) return;

        console.log(`[EVENT] Ticket channel deleted in Discord: ${channel.name} (${channel.id})`);

        try {
            // Fetch recent messages for the transcript
            // Note: In channelDelete event, the channel might still have messages in cache
            // but fetching from API might fail if the channel is already gone.
            // We try our best to get the messages.
            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            
            if (messages && messages.size > 0) {
                saveTranscriptToDashboard(channel.guild.id, channel.id, {
                    user: channel.name.replace('ticket-', ''),
                    messages: formatMessagesForDashboard(messages)
                });
                console.log(`[EVENT] Successfully saved transcript for deleted channel: ${channel.name}`);
            } else {
                console.log(`[EVENT] No messages found for deleted channel: ${channel.name}`);
            }
        } catch (error) {
            console.error(`[EVENT] Error saving transcript for deleted channel ${channel.name}:`, error);
        }
    },
};
