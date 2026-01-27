const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        // Note: MM Application is now handled via Modals in interactionCreate.js
        
        const channel = message.channel;
        const channelName = channel.name;
        
        // Only process messages in ticket channels if needed
        if (!channelName || !channelName.startsWith('ticket-')) return;
    }
};
