-- AI configuration table
CREATE TABLE IF NOT EXISTS ai_config (
  guild_id VARCHAR(255) PRIMARY KEY,
  enabled TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI memory/training table
CREATE TABLE IF NOT EXISTS ai_memory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guild_user (guild_id, user_id),
  INDEX idx_timestamp (timestamp)
);
