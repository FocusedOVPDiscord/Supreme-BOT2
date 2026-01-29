const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );
`);

module.exports = {
    addTraining: (query, response, category = 'general') => {
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
        return db.prepare('DELETE FROM training WHERE id = ?').run(id);
    },
    createTicket: (id, userId, category) => {
        const stmt = db.prepare('INSERT INTO tickets (id, user_id, category) VALUES (?, ?, ?)');
        return stmt.run(id, userId, category);
    },
    updateTicketStatus: (id, status) => {
        return db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id);
    },
    addConversation: (ticketId, userId, message, isAi = 0) => {
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
