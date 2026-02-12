/**
 * Migration script to fix ai_memory table for TiDB compatibility
 * This runs automatically on every startup to ensure the table is correct
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAIMemoryTable() {
  let connection;
  
  try {
    console.log('🔧 [AI MIGRATION] Fixing ai_memory table for TiDB...');
    
    // Create direct connection
    connection = await mysql.createConnection({
      host: process.env.TIDB_HOST,
      port: process.env.TIDB_PORT || 4000,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl: {
        rejectUnauthorized: true
      }
    });
    
    // Force drop existing table (ignore errors if it doesn't exist)
    try {
      await connection.execute('DROP TABLE IF EXISTS ai_memory');
      console.log('✅ [AI MIGRATION] Dropped old ai_memory table');
    } catch (err) {
      console.log('⚠️ [AI MIGRATION] Table did not exist or could not be dropped:', err.message);
    }
    
    // Recreate with VARCHAR instead of ENUM
    await connection.execute(`
      CREATE TABLE ai_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_user (guild_id, user_id),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('✅ [AI MIGRATION] Created new ai_memory table (TiDB compatible - VARCHAR instead of ENUM)');
    
    await connection.end();
    console.log('🎉 [AI MIGRATION] AI memory table migration complete!');
  } catch (error) {
    console.error('❌ [AI MIGRATION] Failed to fix ai_memory table:', error);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore connection close errors
      }
    }
    // Don't exit with error - let the bot continue
    console.log('⚠️ [AI MIGRATION] Continuing bot startup despite migration error...');
  }
}

// Run migration
fixAIMemoryTable().then(() => {
  console.log('✅ [AI MIGRATION] Migration script finished');
}).catch((err) => {
  console.error('❌ [AI MIGRATION] Migration script error:', err);
});
