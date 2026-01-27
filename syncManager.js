const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * SyncManager handles automatic GitHub pushes for data files
 * to ensure persistence on ephemeral platforms like justrunmy.app
 */
class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.pendingSync = false;
        this.lastSyncTime = 0;
        this.syncInterval = 30000; // Minimum 30 seconds between syncs to avoid spamming
    }

    /**
     * Pull the latest data from GitHub on startup
     */
    async pullData() {
        console.log('[SYNC] Pulling latest data from GitHub on startup...');
        return new Promise((resolve) => {
            // Force pull to ensure we have the latest data files
            const cmd = `git fetch origin main && git checkout origin/main -- data/`;
            exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[SYNC PULL ERROR] ${error.message}`);
                    resolve(false);
                } else {
                    console.log(`[SYNC PULL SUCCESS] Latest data pulled from GitHub`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Trigger a sync to GitHub
     * @param {string} reason - The reason for the sync (for commit message)
     */
    async sync(reason = 'Update data') {
        const now = Date.now();
        
        // If already syncing, mark that we need another sync after this one
        if (this.isSyncing) {
            this.pendingSync = true;
            return;
        }

        // Rate limiting: don't sync too often
        if (now - this.lastSyncTime < this.syncInterval) {
            if (!this.pendingSync) {
                this.pendingSync = true;
                setTimeout(() => this.sync(reason), this.syncInterval - (now - this.lastSyncTime));
            }
            return;
        }

        this.isSyncing = true;
        this.pendingSync = false;
        this.lastSyncTime = now;

        console.log(`[SYNC] Starting GitHub sync: ${reason}`);

        return new Promise((resolve) => {
            // We only want to sync the data directory
            const cmd = `git add data/*.json && git commit -m "Bot Data Sync: ${reason}" && git push origin main`;
            
            exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
                this.isSyncing = false;
                
                if (error) {
                    console.error(`[SYNC ERROR] ${error.message}`);
                    // If it failed because there's nothing to commit, that's fine
                    if (stderr.includes('nothing to commit')) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    console.log(`[SYNC SUCCESS] Data pushed to GitHub`);
                    resolve(true);
                }

                // If a sync was requested while we were busy, do it now
                if (this.pendingSync) {
                    setTimeout(() => this.sync('Pending updates'), 5000);
                }
            });
        });
    }
}

module.exports = new SyncManager();
