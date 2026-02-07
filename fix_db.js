const { query } = require('./utils/db');

async function fixDatabase() {
    console.log('🔍 Checking database for missing columns...');
    try {
        // Check if has_left column exists in join_history
        const columns = await query('SHOW COLUMNS FROM join_history');
        const hasLeftExists = columns.some(col => col.Field === 'has_left');

        if (!hasLeftExists) {
            console.log('➕ Adding missing "has_left" column to join_history table...');
            await query('ALTER TABLE join_history ADD COLUMN has_left BOOLEAN DEFAULT 0');
            console.log('✅ Successfully added "has_left" column.');
        } else {
            console.log('✅ "has_left" column already exists.');
        }
    } catch (error) {
        console.error('❌ Error fixing database:', error);
    }
}

module.exports = { fixDatabase };

if (require.main === module) {
    fixDatabase().then(() => process.exit(0));
}
