-- Growtopia Price Prediction System Database Schema

-- Table: gt_items
-- Stores all Growtopia items being tracked
CREATE TABLE IF NOT EXISTS gt_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    rarity VARCHAR(50),
    category VARCHAR(100),
    created_at BIGINT NOT NULL DEFAULT 0,
    created_by VARCHAR(255),
    INDEX idx_item_name (item_name),
    INDEX idx_category (category)
);

-- Table: gt_price_history
-- Stores all price entries submitted by admins
CREATE TABLE IF NOT EXISTS gt_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    price INT NOT NULL,
    submitted_by VARCHAR(255) NOT NULL,
    source VARCHAR(100) DEFAULT 'manual',
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES gt_items(id) ON DELETE CASCADE,
    INDEX idx_item_id (item_id),
    INDEX idx_submitted_by (submitted_by),
    INDEX idx_created_at (created_at)
);

-- Table: gt_admin_stats
-- Tracks admin contributions and points
CREATE TABLE IF NOT EXISTS gt_admin_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255),
    total_prices_added INT DEFAULT 0,
    total_points INT DEFAULT 0,
    monthly_points INT DEFAULT 0,
    last_submission BIGINT DEFAULT 0,
    rank_position INT DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT 0,
    INDEX idx_user_id (user_id),
    INDEX idx_total_points (total_points DESC),
    INDEX idx_monthly_points (monthly_points DESC)
);

-- Table: gt_predictions
-- Stores AI-generated price predictions
CREATE TABLE IF NOT EXISTS gt_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    current_price INT NOT NULL,
    predicted_1month_min INT,
    predicted_1month_max INT,
    predicted_6months_min INT,
    predicted_6months_max INT,
    predicted_1year_min INT,
    predicted_1year_max INT,
    growth_rate DECIMAL(5,2),
    volatility VARCHAR(50),
    risk_level VARCHAR(50),
    confidence DECIMAL(5,2),
    data_points INT,
    created_at BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES gt_items(id) ON DELETE CASCADE,
    INDEX idx_item_id (item_id),
    INDEX idx_created_at (created_at)
);

-- Table: gt_leaderboard_history
-- Tracks monthly leaderboard snapshots
CREATE TABLE IF NOT EXISTS gt_leaderboard_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    points INT,
    rank_position INT,
    month INT,
    year INT,
    created_at BIGINT NOT NULL DEFAULT 0,
    INDEX idx_user_id (user_id),
    INDEX idx_month_year (month, year)
);
