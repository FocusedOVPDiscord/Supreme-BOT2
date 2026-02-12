-- Drop the ai_memory table if it exists with ENUM type
DROP TABLE IF EXISTS ai_memory;

-- Recreate with VARCHAR instead of ENUM (TiDB compatible)
CREATE TABLE IF NOT EXISTS ai_memory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_user (guild_id, user_id),
    INDEX idx_timestamp (timestamp)
);
