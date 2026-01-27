const persistence = require('./persistenceManager');

/**
 * Initialize data directory with persistence manager
 * This ensures all data files are created and ready to use
 */
function initializeDataDirectory() {
    console.log('[DATA INIT] Initializing data directory with persistence manager...');
    
    // Initialize all data files using the persistence manager
    persistence.initializeAllFiles();
    
    // Create a startup backup
    const backupDir = persistence.backupAll();
    if (backupDir) {
        console.log('[DATA INIT] Created startup backup');
    }
    
    console.log('[DATA INIT] Data directory initialization complete');
}

module.exports = { initializeDataDirectory };
