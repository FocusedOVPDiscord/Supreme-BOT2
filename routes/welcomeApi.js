const express = require('express');
const router = express.Router();
const storage = require('../commands/utility/storage.js');

/**
 * GET /api/welcome/:guildId
 * Get welcome message configuration for a guild
 */
router.get('/:guildId', (req, res) => {
    try {
        const { guildId } = req.params;
        const config = storage.get(guildId, 'welcome_config') || {};
        
        res.json({
            enabled: !!config.channelId,
            channelId: config.channelId || null,
            title: config.title || '',
            description: config.description || '',
            bannerUrl: config.bannerUrl || '',
        });
    } catch (error) {
        console.error('[Welcome API] Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch welcome configuration' });
    }
});

/**
 * POST /api/welcome/:guildId
 * Update welcome message configuration for a guild
 */
router.post('/:guildId', (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, channelId, title, description, bannerUrl } = req.body;

        if (!enabled) {
            // Disable welcome messages
            storage.delete(guildId, 'welcome_config');
            return res.json({ success: true, message: 'Welcome messages disabled' });
        }

        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required when enabled' });
        }

        const config = {
            channelId,
            title: title || '',
            description: description || '',
            bannerUrl: bannerUrl || '',
        };

        storage.set(guildId, 'welcome_config', config);
        
        res.json({ 
            success: true, 
            message: 'Welcome configuration saved',
            config 
        });
    } catch (error) {
        console.error('[Welcome API] Error saving config:', error);
        res.status(500).json({ error: 'Failed to save welcome configuration' });
    }
});

/**
 * GET /api/welcome/:guildId/channels
 * Get list of text channels in the guild
 */
router.get('/:guildId/channels', (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.get('client');
        
        if (!client) {
            return res.status(500).json({ error: 'Bot client not available' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const channels = guild.channels.cache
            .filter(channel => channel.isTextBased() && !channel.isThread())
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({ channels });
    } catch (error) {
        console.error('[Welcome API] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

module.exports = router;
