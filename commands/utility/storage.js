const fs = require('fs');
const path = require('path');
const { getPath } = require('../../pathConfig');

const settingsPath = getPath('settings.json');

module.exports = {
    get(guildId, key) {
        try {
            if (!fs.existsSync(settingsPath)) return null;
            const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return data[guildId] ? data[guildId][key] : null;
        } catch (error) {
            console.error('Error reading settings:', error);
            return null;
        }
    },

    set(guildId, key, value) {
        try {
            let data = {};
            if (fs.existsSync(settingsPath)) {
                data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
            if (!data[guildId]) data[guildId] = {};
            data[guildId][key] = value;
            fs.writeFileSync(settingsPath, JSON.stringify(data, null, 4));
            return true;
        } catch (error) {
            console.error('Error writing settings:', error);
            return false;
        }
    },

    delete(guildId, key) {
        try {
            if (!fs.existsSync(settingsPath)) return false;
            const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (data[guildId] && data[guildId][key] !== undefined) {
                delete data[guildId][key];
                fs.writeFileSync(settingsPath, JSON.stringify(data, null, 4));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting from settings:', error);
            return false;
        }
    }
};
