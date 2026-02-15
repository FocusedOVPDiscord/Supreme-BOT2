const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    port: process.env.TIDB_PORT || 4000,
    user: process.env.TIDB_USER || '39dLWhtiYpb23H3.root',
    password: process.env.TIDB_PASSWORD || 'Fy7EgTV2syrN0E3N',
    database: process.env.TIDB_DB || 'test',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
};

let pool;

async function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 10000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
        
        // Handle pool errors
        pool.on('error', (err) => {
            console.error('❌ [DB POOL ERROR]:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
                console.error('🔄 [DB] Connection lost, pool will reconnect automatically');
            }
        });
    }
    return pool;
}

async function query(sql, params) {
    try {
        const p = await getPool();
        const [results] = await p.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ [DB QUERY ERROR]:', error.message);
        console.error('   SQL:', sql);
        console.error('   Params:', params);
        throw error;
    }
}

module.exports = {
    query,
    getPool
};
