const { query } = require('../utils/db');

/**
 * Fix ai_config table schema
 * Drop and recreate with correct columns
 */
async function fixAiConfig() {
    try {
        console.log('🔧 [MIGRATION] Fixing ai_config table schema...');
        
        // Drop old table if exists
        await query('DROP TABLE IF EXISTS ai_config');
        console.log('✅ Dropped old ai_config table');
        
        // Create new table with correct schema
        await query(`
            CREATE TABLE IF NOT EXISTS ai_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                config_key VARCHAR(255) NOT NULL,
                config_value TEXT,
                created_at BIGINT NOT NULL DEFAULT 0,
                updated_at BIGINT NOT NULL DEFAULT 0,
                UNIQUE KEY unique_guild_config (guild_id, config_key),
                INDEX idx_guild (guild_id)
            )
        `);
        console.log('✅ Created ai_config table with correct schema');
        
        return true;
    } catch (error) {
        console.error('❌ [MIGRATION] Failed to fix ai_config table:', error);
        return false;
    }
}

module.exports = { fixAiConfig };
