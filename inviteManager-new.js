const persistence = require('./persistenceManager');

/**
 * Enhanced InviteManager with proper persistence
 * All data is immediately saved to disk and survives bot restarts
 */
class InviteManager {
    constructor() {
        this.invitesFile = 'invites.json';
        this.joinHistoryFile = 'join-history.json';
        this.configFile = 'invite-config.json';
        console.log('[INVITE MANAGER] Initialized with persistence');
    }

    /**
     * Get user invite data
     */
    getUserData(guildId, userId) {
        return persistence.getUserData(
            this.invitesFile, 
            guildId, 
            userId, 
            { regular: 0, fake: 0, bonus: 0, left: 0 }
        );
    }

    /**
     * Update user invite data
     */
    updateUser(guildId, userId, updates) {
        const current = this.getUserData(guildId, userId);
        const updated = { ...current, ...updates };
        persistence.setUserData(this.invitesFile, guildId, userId, updated);
        console.log(`[INVITE MANAGER] Updated user ${userId} in guild ${guildId}:`, updated);
        return updated;
    }

    /**
     * Get invite configuration
     */
    getConfig() {
        return persistence.read(this.configFile, {
            fakeAccountAgeHours: 168,
            autoFarmWindowMinutes: 30,
            requireAvatar: true,
            suspiciousUsernamePatterns: []
        });
    }

    /**
     * Save invite configuration
     */
    saveConfig(config) {
        return persistence.write(this.configFile, config);
    }

    /**
     * Check if a member is considered fake
     */
    isFakeMember(member) {
        const config = this.getConfig();
        const accountAge = Date.now() - member.user.createdTimestamp;
        const threshold = config.fakeAccountAgeHours * 60 * 60 * 1000;
        
        if (accountAge < threshold) {
            console.log(`[INVITE MANAGER] Member ${member.user.tag} is fake (account too new)`);
            return true;
        }
        
        if (config.requireAvatar && !member.user.avatar) {
            console.log(`[INVITE MANAGER] Member ${member.user.tag} is fake (no avatar)`);
            return true;
        }
        
        return false;
    }

    /**
     * Check if a user has joined before
     */
    hasJoinedBefore(guildId, userId) {
        const history = persistence.read(this.joinHistoryFile, {});
        const key = `${guildId}_${userId}`;
        return history[key] !== undefined;
    }

    /**
     * Record a user join
     */
    recordJoin(guildId, userId, inviterId, isFake) {
        const history = persistence.read(this.joinHistoryFile, {});
        const key = `${guildId}_${userId}`;
        history[key] = {
            inviterId,
            isFake,
            joinedAt: Date.now()
        };
        persistence.write(this.joinHistoryFile, history);
        console.log(`[INVITE MANAGER] Recorded join: ${userId} invited by ${inviterId} (fake: ${isFake})`);
    }

    /**
     * Get join data for a user
     */
    getJoinData(guildId, userId) {
        const history = persistence.read(this.joinHistoryFile, {});
        const key = `${guildId}_${userId}`;
        return history[key] || null;
    }

    /**
     * Reset all invite data for a guild
     * This PERMANENTLY clears the data and persists the empty state
     */
    resetAll(guildId) {
        console.log(`[INVITE MANAGER] Resetting all invites for guild ${guildId}`);
        
        // Clear invite data for this guild
        const invitesData = persistence.read(this.invitesFile, {});
        if (invitesData[guildId]) {
            // Create backup before clearing
            persistence.createBackup(this.invitesFile);
            
            // Set to empty object (cleared state)
            invitesData[guildId] = {};
            persistence.write(this.invitesFile, invitesData);
            
            console.log(`[INVITE MANAGER] Successfully cleared invite data for guild ${guildId}`);
            return true;
        }
        
        console.log(`[INVITE MANAGER] No invite data found for guild ${guildId}`);
        return false;
    }

    /**
     * Get all invites for a guild (for leaderboard)
     */
    getAllInvites(guildId) {
        return persistence.getGuildData(this.invitesFile, guildId, {});
    }

    /**
     * Add bonus invites to a user
     */
    addBonusInvites(guildId, userId, amount) {
        const userData = this.getUserData(guildId, userId);
        userData.bonus = (userData.bonus || 0) + amount;
        return this.updateUser(guildId, userId, userData);
    }

    /**
     * Calculate total invites for a user
     */
    getTotalInvites(guildId, userId) {
        const data = this.getUserData(guildId, userId);
        return (data.regular || 0) + (data.bonus || 0) - (data.left || 0);
    }

    /**
     * Get leaderboard data for a guild
     */
    getLeaderboard(guildId, limit = 10) {
        const allInvites = this.getAllInvites(guildId);
        
        const leaderboard = Object.entries(allInvites)
            .map(([userId, data]) => ({
                userId,
                total: this.getTotalInvites(guildId, userId),
                regular: data.regular || 0,
                fake: data.fake || 0,
                bonus: data.bonus || 0,
                left: data.left || 0
            }))
            .filter(entry => entry.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, limit);
        
        return leaderboard;
    }

    /**
     * Clean up join history for users who left
     */
    cleanupJoinHistory(guildId, userId) {
        const history = persistence.read(this.joinHistoryFile, {});
        const key = `${guildId}_${userId}`;
        
        if (history[key]) {
            delete history[key];
            persistence.write(this.joinHistoryFile, history);
            console.log(`[INVITE MANAGER] Cleaned up join history for ${userId}`);
        }
    }

    /**
     * Export all data for a guild (for backup purposes)
     */
    exportGuildData(guildId) {
        return {
            invites: this.getAllInvites(guildId),
            config: this.getConfig(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import guild data (for restore purposes)
     */
    importGuildData(guildId, data) {
        if (data.invites) {
            persistence.setGuildData(this.invitesFile, guildId, data.invites);
        }
        if (data.config) {
            persistence.write(this.configFile, data.config);
        }
        console.log(`[INVITE MANAGER] Imported data for guild ${guildId}`);
    }
}

module.exports = new InviteManager();
