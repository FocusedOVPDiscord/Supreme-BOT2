const fs = require('fs');
const path = require('path');
const { getPath, DATA_DIR } = require('./pathConfig');

class InviteManager {
    constructor() {
        this.dataPath = getPath('invites.json');
        this.joinHistoryPath = getPath('join-history.json');
        this.configPath = getPath('invite-config.json');
        this.ensureDataFiles();
    }

    ensureDataFiles() {
        const dataDir = DATA_DIR;
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(this.dataPath)) fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 2));
        if (!fs.existsSync(this.joinHistoryPath)) fs.writeFileSync(this.joinHistoryPath, JSON.stringify({}, null, 2));
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = { fakeAccountAgeHours: 168, autoFarmWindowMinutes: 30, requireAvatar: true, suspiciousUsernamePatterns: [] };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
        }
    }

    loadData() {
        try { return JSON.parse(fs.readFileSync(this.dataPath, 'utf8')); } 
        catch (error) { return {}; }
    }

    saveData(data) {
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    }

    loadJoinHistory() {
        try { return JSON.parse(fs.readFileSync(this.joinHistoryPath, 'utf8')); } 
        catch (error) { return {}; }
    }

    saveJoinHistory(data) {
        fs.writeFileSync(this.joinHistoryPath, JSON.stringify(data, null, 2));
    }

    getConfig() {
        try { return JSON.parse(fs.readFileSync(this.configPath, 'utf8')); } 
        catch (error) { return { fakeAccountAgeHours: 168, autoFarmWindowMinutes: 30, requireAvatar: true, suspiciousUsernamePatterns: [] }; }
    }

    saveConfig(config) {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }

    getUserData(guildId, userId) {
        const data = this.loadData();
        if (!data[guildId]) data[guildId] = {};
        if (!data[guildId][userId]) {
            data[guildId][userId] = { regular: 0, fake: 0, bonus: 0, left: 0 };
            this.saveData(data);
        }
        return data[guildId][userId];
    }

    updateUser(guildId, userId, updates) {
        const data = this.loadData();
        if (!data[guildId]) data[guildId] = {};
        if (!data[guildId][userId]) data[guildId][userId] = { regular: 0, fake: 0, bonus: 0, left: 0 };
        Object.assign(data[guildId][userId], updates);
        this.saveData(data);
        return data[guildId][userId];
    }

    isFakeMember(member) {
        const config = this.getConfig();
        const accountAge = Date.now() - member.user.createdTimestamp;
        const threshold = config.fakeAccountAgeHours * 60 * 60 * 1000;
        if (accountAge < threshold) return true;
        if (config.requireAvatar && !member.user.avatar) return true;
        return false;
    }

    hasJoinedBefore(guildId, userId) {
        const history = this.loadJoinHistory();
        const key = `${guildId}_${userId}`;
        return history[key] !== undefined;
    }

    recordJoin(guildId, userId, inviterId, isFake) {
        const history = this.loadJoinHistory();
        const key = `${guildId}_${userId}`;
        history[key] = { inviterId, isFake, joinedAt: Date.now() };
        this.saveJoinHistory(history);
    }

    getJoinData(guildId, userId) {
        const history = this.loadJoinHistory();
        const key = `${guildId}_${userId}`;
        return history[key] || null;
    }

    resetAll(guildId) {
        const data = this.loadData();
        if (data[guildId]) {
            data[guildId] = {};
            this.saveData(data);
            return true;
        }
        return false;
    }
}

module.exports = new InviteManager();
