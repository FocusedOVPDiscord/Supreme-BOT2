const { query } = require('../utils/db');

async function migrateEmailVerification() {
    try {
        console.log('Running email verification migration...');

        // Create user_emails table for linking emails to Discord accounts
        await query(`
            CREATE TABLE IF NOT EXISTS user_emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                verification_code VARCHAR(10),
                code_expires_at BIGINT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                INDEX idx_discord_id (discord_id),
                INDEX idx_email (email)
            )
        `);

        // Create email_login_sessions table for email-based login
        await query(`
            CREATE TABLE IF NOT EXISTS email_login_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                verification_code VARCHAR(10) NOT NULL,
                code_expires_at BIGINT NOT NULL,
                attempts INT DEFAULT 0,
                created_at BIGINT NOT NULL,
                INDEX idx_email (email),
                INDEX idx_expires (code_expires_at)
            )
        `);

        console.log('✅ Email verification migration completed successfully');
    } catch (error) {
        console.error('❌ Email verification migration failed:', error);
        throw error;
    }
}

module.exports = migrateEmailVerification;
