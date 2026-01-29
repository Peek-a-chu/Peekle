-- V1__init.sql

-- User Table (users)
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
    `league` VARCHAR(20) DEFAULT 'BRONZE',
    `league_point` INT DEFAULT 0,
    `league_group_id` BIGINT,
    `streak_current` INT DEFAULT 0,
    `streak_max` INT DEFAULT 0,
    `max_league` VARCHAR(255),
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `last_solved_date` DATE,
    `created_at` DATETIME(6) NOT NULL,
    `modified_at` DATETIME(6) NOT NULL
);

-- Problem Table (problems)
CREATE TABLE IF NOT EXISTS `problems` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `source` VARCHAR(255) NOT NULL,
    `external_id` VARCHAR(255) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `tier` VARCHAR(255) NOT NULL,
    `url` TEXT NOT NULL
);

-- SubmissionLog Table (submission_logs)
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

-- League History Table (league_history)
CREATE TABLE IF NOT EXISTS `league_history` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `league` VARCHAR(20) NOT NULL,
    `final_point` INT NOT NULL,
    `result` VARCHAR(20),
    `season_week` INT NOT NULL,
    `closed_at` DATETIME NOT NULL,
    `is_viewed` BOOLEAN DEFAULT FALSE,
    CONSTRAINT `fk_league_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);
