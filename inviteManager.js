const { query } = require('./utils/db');
const fs = require('fs');
const { getPath } = require('./pathConfig');

class InviteManager {
    constructor() {}

    async getUserData(guildId, userId) {
        try {
            const results = await query(
                'SELECT * FROM invites WHERE guild_id = ? AND user_id = ?',
                [guildId, userId]
            );
            if (results.length > 0) {
                const row = results[0];
                return {
                    regular: row.regular || 0,
                    fake: row.fake || 0,
                    bonus: row.bonus || 0,
                    left: row.left_count || 0
                };
            }
        } catch (error) {
            console.error('Error getting user data from TiDB:', error);
        }
        return { regular: 0, fake: 0, bonus: 0, left: 0 };
    }

    async updateUser(guildId, userId, updates) {
        try {
            // If we are specifically updating the 'left' count, we use a relative increment
            // to avoid race conditions from overwriting data with old cached values.
            if (updates.left !== undefined && updates.left_increment === true) {
                await query(
                    'INSERT INTO invites (guild_id, user_id, regular, fake, bonus, left_count) VALUES (?, ?, 0, 0, 0, 1) ON DUPLICATE KEY UPDATE left_count = left_count + 1',
                    [guildId, userId]
                );
                return await this.getUserData(guildId, userId);
            }

            const current = await this.getUserData(guildId, userId);
            const newData = { ...current, ...updates };
            
            await query(
                'INSERT INTO invites (guild_id, user_id, regular, fake, bonus, left_count) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE regular=?, fake=?, bonus=?, left_count=?',
                [guildId, userId, newData.regular, newData.fake, newData.bonus, newData.left, newData.regular, newData.fake, newData.bonus, newData.left]
            );
            return newData;
        } catch (error) {
            console.error('Error updating user in TiDB:', error);
            return updates;
        }
    }

    isFakeMember(member) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const threshold = 168 * 60 * 60 * 1000; // Default 168h
        if (accountAge < threshold) return true;
        if (!member.user.avatar) return true;
        return false;
    }

    async hasJoinedBefore(guildId, userId) {
        try {
            const results = await query(
                'SELECT 1 FROM join_history WHERE guild_id = ? AND user_id = ?',
                [guildId, userId]
            );
            // Returns true if the user exists in join_history for THIS guild
            return results.length > 0;
        } catch (error) {
            console.error('Error checking join history in TiDB:', error);
            return false;
        }
    }

    async recordJoin(guildId, userId, inviterId, isFake) {
        try {
            // We use 0 for false and 1 for true to be compatible with TiDB/MySQL BOOLEAN
            // CRITICAL: On duplicate key, we MUST set has_left = 0 to allow the new session to be tracked.
            await query(
                'INSERT INTO join_history (guild_id, user_id, inviter_id, is_fake, joined_at, has_left) VALUES (?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE inviter_id=?, is_fake=?, joined_at=?, has_left=0',
                [guildId, userId, inviterId, isFake ? 1 : 0, Date.now(), inviterId, isFake ? 1 : 0, Date.now()]
            );
        } catch (error) {
            console.error('Error recording join in TiDB:', error);
        }
    }

    async getJoinData(guildId, userId) {
        try {
            const results = await query(
                'SELECT * FROM join_history WHERE guild_id = ? AND user_id = ?',
                [guildId, userId]
            );
            if (results.length > 0) {
                const row = results[0];
                return {
                    inviterId: row.inviter_id,
                    isFake: row.is_fake === 1,
                    joinedAt: row.joined_at,
                    hasLeft: row.has_left === 1 || row.has_left === true
                };
            }
        } catch (error) {
            console.error('Error getting join data from TiDB:', error);
        }
        return null;
    }

    async recordLeave(guildId, userId) {
        try {
            // We use a strict check: only update if has_left is currently 0.
            const result = await query(
                'UPDATE join_history SET has_left = 1 WHERE guild_id = ? AND user_id = ? AND has_left = 0',
                [guildId, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error recording leave in TiDB:', error);
            return false;
        }
    }

    async syncUserInvites(guildId, userId) {
        try {
            // Count actual regular and left from join_history
            const stats = await query(
                'SELECT COUNT(*) as total, SUM(CASE WHEN has_left = 1 THEN 1 ELSE 0 END) as left_count, SUM(CASE WHEN is_fake = 1 THEN 1 ELSE 0 END) as fake_count FROM join_history WHERE guild_id = ? AND inviter_id = ?',
                [guildId, userId]
            );

            if (stats.length > 0) {
                const row = stats[0];
                const regular = (row.total || 0) - (row.fake_count || 0);
                const left = row.left_count || 0;
                const fake = row.fake_count || 0;

                // Update the main invites table with these REAL numbers
                await query(
                    'UPDATE invites SET regular = ?, left_count = ?, fake = ? WHERE guild_id = ? AND user_id = ?',
                    [regular, left, fake, guildId, userId]
                );
                console.log(`[SYNC] Synced stats for ${userId}: ${regular} reg, ${left} left, ${fake} fake`);
            }
        } catch (error) {
            console.error('Error syncing user invites:', error);
        }
    }

    async resetAll(guildId) {
        try {
            // 1. Delete all invite stats for the guild from TiDB
            await query('DELETE FROM invites WHERE guild_id = ?', [guildId]);
            // 2. Delete all join history for the guild from TiDB
            await query('DELETE FROM join_history WHERE guild_id = ?', [guildId]);

            // 3. IMPORTANT: Also clear the legacy JSON files if they exist
            // This prevents the migration script from reloading old data on next restart
            const invitesPath = getPath('invites.json');
            if (fs.existsSync(invitesPath)) {
                try {
                    let invites = JSON.parse(fs.readFileSync(invitesPath, 'utf8'));
                    if (invites[guildId]) {
                        delete invites[guildId];
                        fs.writeFileSync(invitesPath, JSON.stringify(invites, null, 2));
                        console.log(`[RESET] Cleared legacy invites.json for guild ${guildId}`);
                    }
                } catch (e) {
                    console.error('Error clearing invites.json:', e);
                }
            }

            const joinHistoryPath = getPath('join-history.json');
            if (fs.existsSync(joinHistoryPath)) {
                try {
                    let history = JSON.parse(fs.readFileSync(joinHistoryPath, 'utf8'));
                    // join-history.json uses guildId_userId as keys
                    let changed = false;
                    for (const key in history) {
                        if (key.startsWith(`${guildId}_`)) {
                            delete history[key];
                            changed = true;
                        }
                    }
                    if (changed) {
                        fs.writeFileSync(joinHistoryPath, JSON.stringify(history, null, 2));
                        console.log(`[RESET] Cleared legacy join-history.json for guild ${guildId}`);
                    }
                } catch (e) {
                    console.error('Error clearing join-history.json:', e);
                }
            }

            return true;
        } catch (error) {
            console.error('Error resetting guild data in TiDB:', error);
            return false;
        }
    }
}

module.exports = new InviteManager();
