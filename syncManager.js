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
            // Setup git config first to avoid errors on some platforms
            const setupCmd = `git config user.name "Supreme Bot" && git config user.email "bot@supreme.com"`;
            
            exec(setupCmd, { cwd: __dirname }, () => {
                // Force pull to ensure we have the latest data files
                // We use 'git fetch --all' and 'git reset --hard' to ensure we match GitHub exactly
                const cmd = `git fetch origin main && git checkout origin/main -- data/`;
                exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[SYNC PULL ERROR] ${error.message}`);
                        // If checkout fails, try a different approach
                        const fallbackCmd = `git pull origin main`;
                        exec(fallbackCmd, { cwd: __dirname }, (err) => {
                            if (err) console.error(`[SYNC PULL FALLBACK ERROR] ${err.message}`);
                            resolve(!err);
                        });
                    } else {
                        console.log(`[SYNC PULL SUCCESS] Latest data pulled from GitHub`);
                        resolve(true);
                    }
                });
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
            // Use the full URL with credentials for the push to ensure it works on the server
            const remoteUrl = 'https://a9Y6Ag:Kj85FaEi2e7Z4Wz@justrunmy.app/git/r_s2E5Wd';
            const cmd = `git add data/*.json && git commit -m "Bot Data Sync: ${reason}" && git push ${remoteUrl} HEAD:deploy && git push origin main`;
            
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
