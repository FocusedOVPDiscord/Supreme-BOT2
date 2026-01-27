const persistence = require('../../persistenceManager');

/**
 * Enhanced storage utility with proper persistence
 * All settings are immediately saved and survive bot restarts
 */
const settingsFile = 'settings.json';

module.exports = {
    /**
     * Get a setting value for a guild
     */
    get(guildId, key) {
        try {
            const guildData = persistence.getGuildData(settingsFile, guildId, {});
            const value = guildData[key];
            console.log(`[STORAGE] Get ${key} for guild ${guildId}:`, value !== undefined ? 'found' : 'not found');
            return value !== undefined ? value : null;
        } catch (error) {
            console.error('[STORAGE] Error reading setting:', error);
            return null;
        }
    },

    /**
     * Set a setting value for a guild
     */
    set(guildId, key, value) {
        try {
            const guildData = persistence.getGuildData(settingsFile, guildId, {});
            guildData[key] = value;
            const success = persistence.setGuildData(settingsFile, guildId, guildData);
            
            if (success) {
                console.log(`[STORAGE] Set ${key} for guild ${guildId}`);
            } else {
                console.error(`[STORAGE] Failed to set ${key} for guild ${guildId}`);
            }
            
            return success;
        } catch (error) {
            console.error('[STORAGE] Error writing setting:', error);
            return false;
        }
    },

    /**
     * Delete a setting value for a guild
     */
    delete(guildId, key) {
        try {
            const guildData = persistence.getGuildData(settingsFile, guildId, {});
            
            if (guildData[key] !== undefined) {
                delete guildData[key];
                const success = persistence.setGuildData(settingsFile, guildId, guildData);
                
                if (success) {
                    console.log(`[STORAGE] Deleted ${key} for guild ${guildId}`);
                }
                
                return success;
            }
            
            return false;
        } catch (error) {
            console.error('[STORAGE] Error deleting setting:', error);
            return false;
        }
    },

    /**
     * Get all settings for a guild
     */
    getAll(guildId) {
        try {
            return persistence.getGuildData(settingsFile, guildId, {});
        } catch (error) {
            console.error('[STORAGE] Error reading all settings:', error);
            return {};
        }
    },

    /**
     * Clear all settings for a guild
     */
    clearAll(guildId) {
        try {
            const success = persistence.setGuildData(settingsFile, guildId, {});
            
            if (success) {
                console.log(`[STORAGE] Cleared all settings for guild ${guildId}`);
            }
            
            return success;
        } catch (error) {
            console.error('[STORAGE] Error clearing settings:', error);
            return false;
        }
    },

    /**
     * Check if a setting exists
     */
    has(guildId, key) {
        try {
            const guildData = persistence.getGuildData(settingsFile, guildId, {});
            return guildData[key] !== undefined;
        } catch (error) {
            console.error('[STORAGE] Error checking setting:', error);
            return false;
        }
    },

    /**
     * Update multiple settings at once
     */
    setMultiple(guildId, settings) {
        try {
            const guildData = persistence.getGuildData(settingsFile, guildId, {});
            Object.assign(guildData, settings);
            const success = persistence.setGuildData(settingsFile, guildId, guildData);
            
            if (success) {
                console.log(`[STORAGE] Updated multiple settings for guild ${guildId}`);
            }
            
            return success;
        } catch (error) {
            console.error('[STORAGE] Error updating multiple settings:', error);
            return false;
        }
    },

    /**
     * Export all settings for a guild (for backup)
     */
    export(guildId) {
        return {
            guildId,
            settings: this.getAll(guildId),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Import settings for a guild (for restore)
     */
    import(guildId, data) {
        try {
            if (data.settings) {
                const success = persistence.setGuildData(settingsFile, guildId, data.settings);
                
                if (success) {
                    console.log(`[STORAGE] Imported settings for guild ${guildId}`);
                }
                
                return success;
            }
            return false;
        } catch (error) {
            console.error('[STORAGE] Error importing settings:', error);
            return false;
        }
    }
};
