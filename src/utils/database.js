const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pathConfig = require('../../pathConfig');

// Use pathConfig to get the database path, ensuring it's in the persistent /app/data directory
const dbPath = pathConfig.getPath('supreme_bot_2.db');
const dbDir = path.dirname(dbPath);

// --- DEBUG LOGGING FOR VOLUME VERIFICATION ---
console.log('-------------------------------------------');
console.log('🔍 [DATABASE DEBUG] Initialization Started');
console.log(`📂 [DATABASE DEBUG] Target Path: ${dbPath}`);
console.log(`📂 [DATABASE DEBUG] Directory: ${dbDir}`);
console.log(`✅ [DATABASE DEBUG] Directory exists: ${fs.existsSync(dbDir)}`);

try {
    const testFile = path.join(dbDir, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('📝 [DATABASE DEBUG] Volume Write Test: SUCCESS');
} catch (e) {
    console.error('❌ [DATABASE DEBUG] Volume Write Test: FAILED -', e.message);
}
console.log('-------------------------------------------');

const db = new Database(dbPath);

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        is_ai INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log('🚀 [DATABASE] Supreme Bot 2 Engine initialized.');

module.exports = {
    addTraining: (query, response, category = 'general') => {
        console.log(`📚 [DATABASE DEBUG] Adding Training: ${query.substring(0, 30)}...`);
        const stmt = db.prepare('INSERT INTO training (query, response, category) VALUES (?, ?, ?)');
        return stmt.run(query, response, category);
    },
    getAllTraining: () => {
        return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all();
    },
    getStats: () => {
        const trainingCount = db.prepare('SELECT COUNT(*) as count FROM training').get().count;
        const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = "open"').get().count;
        const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
        return { trainingCount, ticketCount, conversationCount };
    },
    deleteTraining: (id) => {
        console.log(`🗑️ [DATABASE DEBUG] Deleting Training ID: ${id}`);
        return db.prepare('DELETE FROM training WHERE id = ?').run(id);
    },
    createTicket: (id, userId, category) => {
        console.log(`🎫 [DATABASE DEBUG] Creating Ticket: ${id}`);
        const stmt = db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, category) VALUES (?, ?, ?)');
        return stmt.run(id, userId, category);
    },
    updateTicketStatus: (id, status) => {
        console.log(`🎫 [DATABASE DEBUG] Updating Ticket Status: ${id} -> ${status}`);
        return db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id);
    },
    addConversation: (ticketId, userId, message, isAi = 0) => {
        console.log(`📝 [DATABASE DEBUG] Saving Conversation: [${ticketId}] ${isAi ? 'AI' : 'User'}: ${message.substring(0, 50)}...`);
        // Ensure ticket exists
        db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, "open")').run(ticketId, userId);
        const stmt = db.prepare('INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)');
        return stmt.run(ticketId, userId, message, isAi);
    },
    searchSimilar: (query) => {
        return db.prepare('SELECT * FROM training WHERE query LIKE ? LIMIT 1').get(`%${query}%`);
    },
    incrementUsage: (id) => {
        return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id);
    }
};
