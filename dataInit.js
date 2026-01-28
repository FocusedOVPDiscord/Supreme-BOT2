const fs = require('fs');
const path = require('path');
const { DATA_DIR, getPath } = require('./pathConfig');

function initializeDataDirectory() {
    const dataDir = DATA_DIR;
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('[DATA INIT] Created data directory at ' + dataDir);
    }

    const dataFiles = {
        'active_apps.json': {},
        'completed_apps.json': [],
        'counter.json': { ticketCount: 0 },
        'fakes.json': {},
        'history.json': {},
        'joins.json': {},
        'lefts.json': {},
        'regulars.json': {},
        'settings.json': {},
        'invites.json': {},
        'join-history.json': {},
        'invite-config.json': { fakeAccountAgeHours: 168, autoFarmWindowMinutes: 30, requireAvatar: true, suspiciousUsernamePatterns: [] }
    };

    // Initialize missing files
    for (const [filename, defaultContent] of Object.entries(dataFiles)) {
        const filePath = getPath(filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
            console.log(`[DATA INIT] Initialized ${filename}`);
        }
    }
}

module.exports = { initializeDataDirectory };
