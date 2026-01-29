const path = require('path');
const fs = require('fs');

/**
 * PathConfig ensures the bot uses a persistent directory for data.
 * On Koyeb, the volume should be mounted at /app/data
 */
const DATA_DIR = process.env.DATA_DIR || '/app/data';

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.warn(`⚠️ Could not create DATA_DIR at ${DATA_DIR}, falling back to local data/`);
    }
}

module.exports = {
    DATA_DIR,
    getPath: (filename) => path.join(DATA_DIR, filename)
};
