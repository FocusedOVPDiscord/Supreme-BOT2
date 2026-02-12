/**
 * Migration script to fix ai_memory table for TiDB compatibility
 * Run this once to drop and recreate the table without ENUM type
 */

require('dotenv').config();
const { query } = require('./utils/db');

async function fixAIMemoryTable() {
  try {
    console.log('🔧 [MIGRATION] Fixing ai_memory table for TiDB...');
    
    // Drop existing table
    await query('DROP TABLE IF EXISTS ai_memory');
    console.log('✅ [MIGRATION] Dropped old ai_memory table');
    
    // Recreate with VARCHAR instead of ENUM
    await query(`
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
    console.log('✅ [MIGRATION] Created new ai_memory table (TiDB compatible)');
    
    console.log('🎉 [MIGRATION] AI memory table migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [MIGRATION] Failed to fix ai_memory table:', error);
    process.exit(1);
  }
}

fixAIMemoryTable();
