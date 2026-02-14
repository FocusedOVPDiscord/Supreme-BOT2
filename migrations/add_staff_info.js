const { query } = require('../utils/db');

async function migrateStaffInfo() {
    try {
        console.log('📋 Creating staff_info table...');
        
        await query(`
            CREATE TABLE IF NOT EXISTS staff_info (
                guild_id VARCHAR(255),
                user_id VARCHAR(255),
                main_epic VARCHAR(255),
                additional_mm TEXT,
                custom_notes TEXT,
                updated_at BIGINT,
                PRIMARY KEY (guild_id, user_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS staff_embeds (
                guild_id VARCHAR(255),
                channel_id VARCHAR(255),
                message_id VARCHAR(255),
                created_at BIGINT,
                PRIMARY KEY (guild_id, message_id)
            )
        `);

        console.log('✅ staff_info and staff_embeds tables created successfully');
    } catch (error) {
        console.error('❌ Error creating staff_info tables:', error);
        throw error;
    }
}

module.exports = { migrateStaffInfo };

// Run migration if called directly
if (require.main === module) {
    migrateStaffInfo()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
