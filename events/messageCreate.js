const { Events } = require('discord.js');
const appManager = require('../applicationManager.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        // Handle DM responses for MM Application
        if (!message.guild && message.channel.type === 1) {
            await appManager.handleDMResponse(message, message.client);
            return;
        }
        
        const channel = message.channel;
        const channelName = channel.name;
        
        // Only process messages in ticket channels if needed
        if (!channelName || !channelName.startsWith('ticket-')) return;
    }
};
