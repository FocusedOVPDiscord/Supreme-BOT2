const { query } = require('./utils/db');

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
            return results.length > 0;
        } catch (error) {
            console.error('Error checking join history in TiDB:', error);
            return false;
        }
    }

    async recordJoin(guildId, userId, inviterId, isFake) {
        try {
            await query(
                'INSERT INTO join_history (guild_id, user_id, inviter_id, is_fake, joined_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE inviter_id=?, is_fake=?, joined_at=?',
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
                return {
                    inviterId: results[0].inviter_id,
                    isFake: results[0].is_fake === 1,
                    joinedAt: results[0].joined_at
                };
            }
        } catch (error) {
            console.error('Error getting join data from TiDB:', error);
        }
        return null;
    }

    async resetAll(guildId) {
        try {
            // Delete all invite stats for the guild
            await query('DELETE FROM invites WHERE guild_id = ?', [guildId]);
            // Delete all join history for the guild to ensure a fresh start
            await query('DELETE FROM join_history WHERE guild_id = ?', [guildId]);
            return true;
        } catch (error) {
            console.error('Error resetting guild data in TiDB:', error);
            return false;
        }
    }
}

module.exports = new InviteManager();
