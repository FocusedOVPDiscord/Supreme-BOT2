const fs = require('fs');
const path = require('path');

/**
 * PersistenceManager - Centralized data persistence system
 * Ensures all bot data survives restarts and handles atomic writes
 */
class PersistenceManager {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.backupDir = path.join(__dirname, 'data', 'backups');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log('[PERSISTENCE] Created data directory');
        }
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('[PERSISTENCE] Created backup directory');
        }
    }

    /**
     * Get the full path for a data file
     */
    getFilePath(filename) {
        return path.join(this.dataDir, filename);
    }

    /**
     * Read JSON data from file with error handling
     */
    read(filename, defaultValue = {}) {
        const filePath = this.getFilePath(filename);
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`[PERSISTENCE] File ${filename} doesn't exist, using default value`);
                return defaultValue;
            }
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`[PERSISTENCE] Error reading ${filename}:`, error.message);
            // Try to restore from backup
            const backup = this.restoreFromBackup(filename);
            if (backup !== null) {
                console.log(`[PERSISTENCE] Restored ${filename} from backup`);
                return backup;
            }
            return defaultValue;
        }
    }

    /**
     * Write JSON data to file with atomic write and backup
     */
    write(filename, data) {
        const filePath = this.getFilePath(filename);
        const tempPath = filePath + '.tmp';
        
        try {
            // Create backup before writing
            if (fs.existsSync(filePath)) {
                this.createBackup(filename);
            }

            // Write to temporary file first (atomic write)
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
            
            // Rename temp file to actual file (atomic operation)
            fs.renameSync(tempPath, filePath);
            
            console.log(`[PERSISTENCE] Successfully saved ${filename}`);
            return true;
        } catch (error) {
            console.error(`[PERSISTENCE] Error writing ${filename}:`, error.message);
            // Clean up temp file if it exists
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            return false;
        }
    }

    /**
     * Create a backup of a data file
     */
    createBackup(filename) {
        const filePath = this.getFilePath(filename);
        const backupPath = path.join(this.backupDir, `${filename}.backup`);
        
        try {
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, backupPath);
                console.log(`[PERSISTENCE] Created backup for ${filename}`);
            }
        } catch (error) {
            console.error(`[PERSISTENCE] Error creating backup for ${filename}:`, error.message);
        }
    }

    /**
     * Restore data from backup
     */
    restoreFromBackup(filename) {
        const backupPath = path.join(this.backupDir, `${filename}.backup`);
        
        try {
            if (fs.existsSync(backupPath)) {
                const data = fs.readFileSync(backupPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`[PERSISTENCE] Error restoring backup for ${filename}:`, error.message);
        }
        
        return null;
    }

    /**
     * Delete a data file
     */
    delete(filename) {
        const filePath = this.getFilePath(filename);
        
        try {
            if (fs.existsSync(filePath)) {
                // Create backup before deleting
                this.createBackup(filename);
                fs.unlinkSync(filePath);
                console.log(`[PERSISTENCE] Deleted ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[PERSISTENCE] Error deleting ${filename}:`, error.message);
            return false;
        }
    }

    /**
     * Check if a file exists
     */
    exists(filename) {
        const filePath = this.getFilePath(filename);
        return fs.existsSync(filePath);
    }

    /**
     * Get guild-specific data from a file
     */
    getGuildData(filename, guildId, defaultValue = {}) {
        const allData = this.read(filename, {});
        if (!allData[guildId]) {
            allData[guildId] = defaultValue;
            this.write(filename, allData);
        }
        return allData[guildId];
    }

    /**
     * Set guild-specific data in a file
     */
    setGuildData(filename, guildId, data) {
        const allData = this.read(filename, {});
        allData[guildId] = data;
        return this.write(filename, allData);
    }

    /**
     * Update specific fields in guild data
     */
    updateGuildData(filename, guildId, updates) {
        const allData = this.read(filename, {});
        if (!allData[guildId]) {
            allData[guildId] = {};
        }
        Object.assign(allData[guildId], updates);
        return this.write(filename, allData);
    }

    /**
     * Delete guild-specific data
     */
    deleteGuildData(filename, guildId) {
        const allData = this.read(filename, {});
        if (allData[guildId]) {
            delete allData[guildId];
            return this.write(filename, allData);
        }
        return false;
    }

    /**
     * Get user data within a guild
     */
    getUserData(filename, guildId, userId, defaultValue = {}) {
        const guildData = this.getGuildData(filename, guildId, {});
        if (!guildData[userId]) {
            guildData[userId] = defaultValue;
            this.setGuildData(filename, guildId, guildData);
        }
        return guildData[userId];
    }

    /**
     * Set user data within a guild
     */
    setUserData(filename, guildId, userId, data) {
        const guildData = this.getGuildData(filename, guildId, {});
        guildData[userId] = data;
        return this.setGuildData(filename, guildId, guildData);
    }

    /**
     * Update user data within a guild
     */
    updateUserData(filename, guildId, userId, updates) {
        const guildData = this.getGuildData(filename, guildId, {});
        if (!guildData[userId]) {
            guildData[userId] = {};
        }
        Object.assign(guildData[userId], updates);
        return this.setGuildData(filename, guildId, guildData);
    }

    /**
     * Initialize all required data files with defaults
     */
    initializeAllFiles() {
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
            'invite-config.json': { 
                fakeAccountAgeHours: 168, 
                autoFarmWindowMinutes: 30, 
                requireAvatar: true, 
                suspiciousUsernamePatterns: [] 
            }
        };

        for (const [filename, defaultContent] of Object.entries(dataFiles)) {
            if (!this.exists(filename)) {
                this.write(filename, defaultContent);
                console.log(`[PERSISTENCE] Initialized ${filename}`);
            } else {
                console.log(`[PERSISTENCE] ${filename} already exists`);
            }
        }
    }

    /**
     * Create a full backup of all data files
     */
    backupAll() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullBackupDir = path.join(this.backupDir, `full_backup_${timestamp}`);
        
        try {
            fs.mkdirSync(fullBackupDir, { recursive: true });
            
            const files = fs.readdirSync(this.dataDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const srcPath = path.join(this.dataDir, file);
                    const destPath = path.join(fullBackupDir, file);
                    fs.copyFileSync(srcPath, destPath);
                }
            }
            
            console.log(`[PERSISTENCE] Created full backup at ${fullBackupDir}`);
            return fullBackupDir;
        } catch (error) {
            console.error('[PERSISTENCE] Error creating full backup:', error.message);
            return null;
        }
    }
}

module.exports = new PersistenceManager();
