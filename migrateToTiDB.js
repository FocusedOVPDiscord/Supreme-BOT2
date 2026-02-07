const fs = require('fs');
const path = require('path');
const { query } = require('./utils/db');
const { getPath } = require('./pathConfig');

async function initSchema() {
    console.log('🚀 Initializing TiDB Schema...');
    
    // Settings table
    await query(`
        CREATE TABLE IF NOT EXISTS settings (
            guild_id VARCHAR(255),
            setting_key VARCHAR(255),
            setting_value TEXT,
            PRIMARY KEY (guild_id, setting_key)
        )
    `);

    // Invites table
    await query(`
        CREATE TABLE IF NOT EXISTS invites (
            guild_id VARCHAR(255),
            user_id VARCHAR(255),
            regular INT DEFAULT 0,
            fake INT DEFAULT 0,
            bonus INT DEFAULT 0,
            left_count INT DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    // Join History table
    await query(`
        CREATE TABLE IF NOT EXISTS join_history (
            guild_id VARCHAR(255),
            user_id VARCHAR(255),
            inviter_id VARCHAR(255),
            is_fake BOOLEAN,
            joined_at BIGINT,
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    // Transcripts table
    await query(`
        CREATE TABLE IF NOT EXISTS transcripts (
            id VARCHAR(255) PRIMARY KEY,
            guild_id VARCHAR(255),
            user VARCHAR(255),
            closed_at BIGINT,
            messages JSON
        )
    `);

    // Trusted IPs table
    await query(`
        CREATE TABLE IF NOT EXISTS trusted_ips (
            ip VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255),
            username VARCHAR(255),
            avatar VARCHAR(255),
            last_login DATETIME
        )
    `);

    console.log('✅ Schema initialized.');
}

async function migrateData() {
    console.log('📦 Checking for Data Migration...');

    // 1. Migrate Settings
    const settingsCount = await query('SELECT COUNT(*) as count FROM settings');
    if (settingsCount[0].count === 0) {
        const settingsPath = getPath('settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            for (const [guildId, guildSettings] of Object.entries(settings)) {
                for (const [key, value] of Object.entries(guildSettings)) {
                    await query(
                        'INSERT INTO settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                        [guildId, key, typeof value === 'object' ? JSON.stringify(value) : String(value), typeof value === 'object' ? JSON.stringify(value) : String(value)]
                    );
                }
            }
            console.log('✅ Migrated Settings');
        }
    } else {
        console.log('ℹ️ Settings table not empty, skipping migration.');
    }

    // 2. Migrate Invites
    const invitesCount = await query('SELECT COUNT(*) as count FROM invites');
    if (invitesCount[0].count === 0) {
        const invitesPath = getPath('invites.json');
        if (fs.existsSync(invitesPath)) {
            const invites = JSON.parse(fs.readFileSync(invitesPath, 'utf8'));
            for (const [guildId, users] of Object.entries(invites)) {
                for (const [userId, data] of Object.entries(users)) {
                    await query(
                        'INSERT INTO invites (guild_id, user_id, regular, fake, bonus, left_count) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE regular=?, fake=?, bonus=?, left_count=?',
                        [guildId, userId, data.regular || 0, data.fake || 0, data.bonus || 0, data.left || 0, data.regular || 0, data.fake || 0, data.bonus || 0, data.left || 0]
                    );
                }
            }
            console.log('✅ Migrated Invites');
        }
    } else {
        console.log('ℹ️ Invites table not empty, skipping migration.');
    }

    // 3. Migrate Join History
    const joinHistoryCount = await query('SELECT COUNT(*) as count FROM join_history');
    if (joinHistoryCount[0].count === 0) {
        const joinHistoryPath = getPath('join-history.json');
        if (fs.existsSync(joinHistoryPath)) {
            const history = JSON.parse(fs.readFileSync(joinHistoryPath, 'utf8'));
            for (const [key, data] of Object.entries(history)) {
                const [guildId, userId] = key.split('_');
                if (guildId && userId) {
                    await query(
                        'INSERT INTO join_history (guild_id, user_id, inviter_id, is_fake, joined_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE inviter_id=?, is_fake=?, joined_at=?',
                        [guildId, userId, data.inviterId, data.isFake ? 1 : 0, data.joinedAt, data.inviterId, data.isFake ? 1 : 0, data.joinedAt]
                    );
                }
            }
            console.log('✅ Migrated Join History');
        }
    } else {
        console.log('ℹ️ Join History table not empty, skipping migration.');
    }

    // 4. Migrate Transcripts
    const transcriptsCount = await query('SELECT COUNT(*) as count FROM transcripts');
    if (transcriptsCount[0].count === 0) {
        const transcriptsPath = getPath('transcripts.json');
        if (fs.existsSync(transcriptsPath)) {
            const transcripts = JSON.parse(fs.readFileSync(transcriptsPath, 'utf8'));
            for (const [guildId, list] of Object.entries(transcripts)) {
                for (const t of list) {
                    await query(
                        'INSERT INTO transcripts (id, guild_id, user, closed_at, messages) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE messages=?',
                        [t.id, guildId, t.user, t.closedAt, JSON.stringify(t.messages), JSON.stringify(t.messages)]
                    );
                }
            }
            console.log('✅ Migrated Transcripts');
        }
    } else {
        console.log('ℹ️ Transcripts table not empty, skipping migration.');
    }

    console.log('🏁 Migration Check Complete!');
}

async function run() {
    try {
        await initSchema();
        await migrateData();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

run();
