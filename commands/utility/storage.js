const { query } = require('../../utils/db');

/**
 * Storage utility updated to use TiDB Cloud for persistence.
 */
class Storage {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        if (this.initialized) return;
        try {
            const results = await query('SELECT * FROM settings');
            for (const row of results) {
                if (!this.cache.has(row.guild_id)) {
                    this.cache.set(row.guild_id, {});
                }
                let value = row.setting_value;
                try {
                    if (value && (value.startsWith('{') || value.startsWith('['))) {
                        value = JSON.parse(value);
                    }
                } catch (e) {}
                this.cache.get(row.guild_id)[row.setting_key] = value;
            }
            this.initialized = true;
            console.log('✅ Storage cache initialized from TiDB');
        } catch (error) {
            console.error('❌ Failed to initialize storage from TiDB:', error);
        }
    }

    get(guildId, key) {
        if (!this.cache.has(guildId)) return null;
        return this.cache.get(guildId)[key] || null;
    }

    async set(guildId, key, value) {
        await this.initPromise;
        if (!this.cache.has(guildId)) {
            this.cache.set(guildId, {});
        }
        this.cache.get(guildId)[key] = value;

        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        try {
            await query(
                'INSERT INTO settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [guildId, key, stringValue, stringValue]
            );
        } catch (error) {
            console.error(`❌ Failed to save setting ${key} to TiDB:`, error);
        }
    }

    async delete(guildId, key) {
        await this.initPromise;
        if (this.cache.has(guildId)) {
            delete this.cache.get(guildId)[key];
        }
        try {
            await query('DELETE FROM settings WHERE guild_id = ? AND setting_key = ?', [guildId, key]);
        } catch (error) {
            console.error(`❌ Failed to delete setting ${key} from TiDB:`, error);
        }
    }
}

const storageInstance = new Storage();
module.exports = storageInstance;
