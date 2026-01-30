-- V1__init.sql - Complete Database Schema

-- ========================================
-- 1. Users Table
-- ========================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `social_id` VARCHAR(255) NOT NULL UNIQUE,
    `provider` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(255) UNIQUE,
    `profile_img` VARCHAR(255),
    `profile_img_thumb` VARCHAR(255),
    `boj_id` VARCHAR(255) UNIQUE,
    `extension_token` VARCHAR(100) UNIQUE,
    `extension_token_updated_at` DATETIME(6),
    `league` VARCHAR(20) DEFAULT 'STONE',
    `league_point` INT DEFAULT 0,
    `league_group_id` BIGINT,
    `streak_current` INT DEFAULT 0,
    `streak_max` INT DEFAULT 0,
    `max_league` VARCHAR(20),
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `last_solved_date` DATE,
    `created_at` DATETIME(6) NOT NULL,
    `modified_at` DATETIME(6) NOT NULL
);

-- ========================================
-- 2. Problems Table
-- ========================================
CREATE TABLE IF NOT EXISTS `problems` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `source` VARCHAR(255) NOT NULL,
    `external_id` VARCHAR(255) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `tier` VARCHAR(255) NOT NULL,
    `url` TEXT NOT NULL
);

-- ========================================
-- 3. Tags Table
-- ========================================
CREATE TABLE IF NOT EXISTS `tags` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tag_key` VARCHAR(255) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL
);

-- ========================================
-- 4. Submission Logs Table
-- ========================================
CREATE TABLE IF NOT EXISTS `submission_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `problem_id` BIGINT NOT NULL,
    `source_type` VARCHAR(255),
    `room_id` BIGINT,
    `problem_title` VARCHAR(255),
    `external_id` VARCHAR(255),
    `problem_tier` VARCHAR(255),
    `tag` VARCHAR(255),
    `code` TEXT,
    `memory` INT,
    `execution_time` INT,
    `language` VARCHAR(255),
    `submitted_at` DATETIME(6),
    CONSTRAINT `fk_submission_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `fk_submission_problem` FOREIGN KEY (`problem_id`) REFERENCES `problems` (`id`)
);

-- ========================================
-- 5. Point Logs Table
-- ========================================
CREATE TABLE IF NOT EXISTS `point_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `amount` INT NOT NULL,
    `description` VARCHAR(255),
    `metadata` TEXT,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_point_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- ========================================
-- 6. League Groups Table
-- ========================================
CREATE TABLE IF NOT EXISTS `league_groups` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tier` VARCHAR(20) NOT NULL,
    `season_week` INT NOT NULL,
    `created_at` DATETIME(6) NOT NULL
);

-- ========================================
-- 7. League History Table
-- ========================================
CREATE TABLE IF NOT EXISTS `league_history` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `league` VARCHAR(20) NOT NULL,
    `final_point` INT NOT NULL,
    `result` VARCHAR(20) NOT NULL,
    `season_week` INT NOT NULL,
    `closed_at` DATETIME(6) NOT NULL,
    `is_viewed` BOOLEAN DEFAULT FALSE,
    CONSTRAINT `fk_league_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- ========================================
-- 8. Study Rooms Table
-- ========================================
CREATE TABLE IF NOT EXISTS `study_rooms` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `owner_id` BIGINT NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
    `ranking_point` INT DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_study_room_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
);

-- ========================================
-- 9. Study Members Table
-- ========================================
CREATE TABLE IF NOT EXISTS `study_members` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `joined_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_study_member_room` FOREIGN KEY (`study_room_id`) REFERENCES `study_rooms` (`id`),
    CONSTRAINT `fk_study_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- ========================================
-- 10. Study Problems Table
-- ========================================
CREATE TABLE IF NOT EXISTS `study_problems` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_room_id` BIGINT NOT NULL,
    `problem_id` BIGINT NOT NULL,
    `problem_date` DATE NOT NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_study_problem_room` FOREIGN KEY (`study_room_id`) REFERENCES `study_rooms` (`id`),
    CONSTRAINT `fk_study_problem_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);

-- ========================================
-- 11. Study Chat Logs Table
-- ========================================
CREATE TABLE IF NOT EXISTS `study_chat_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `parent_id` BIGINT,
    `metadata` TEXT,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_chat_log_room` FOREIGN KEY (`study_room_id`) REFERENCES `study_rooms` (`id`),
    CONSTRAINT `fk_chat_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `fk_chat_log_parent` FOREIGN KEY (`parent_id`) REFERENCES `study_chat_logs` (`id`)
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX `idx_users_league` ON `users` (`league`);
CREATE INDEX `idx_users_league_group` ON `users` (`league_group_id`);
CREATE INDEX `idx_submission_user` ON `submission_logs` (`user_id`);
CREATE INDEX `idx_submission_problem` ON `submission_logs` (`problem_id`);
CREATE INDEX `idx_point_log_user` ON `point_logs` (`user_id`);
CREATE INDEX `idx_league_history_user` ON `league_history` (`user_id`);
CREATE INDEX `idx_league_history_season` ON `league_history` (`season_week`);
CREATE INDEX `idx_league_groups_season` ON `league_groups` (`season_week`);
CREATE INDEX `idx_study_member_room` ON `study_members` (`study_room_id`);
CREATE INDEX `idx_study_member_user` ON `study_members` (`user_id`);
CREATE INDEX `idx_study_problem_room` ON `study_problems` (`study_room_id`);
CREATE INDEX `idx_chat_log_room` ON `study_chat_logs` (`study_room_id`);
