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
            queueLimit: 0
        });
    }
    return pool;
}

async function query(sql, params) {
    const p = await getPool();
    const [results] = await p.execute(sql, params);
    return results;
}

module.exports = {
    query,
    getPool
};
