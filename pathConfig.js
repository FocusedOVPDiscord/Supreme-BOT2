const path = require('path');
const fs = require('fs');

/**
 * PathConfig ensures the bot uses a persistent directory for data.
 * On justrunmy.app, this should be mapped to a Volume.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

module.exports = {
    DATA_DIR,
    getPath: (filename) => path.join(DATA_DIR, filename)
};
