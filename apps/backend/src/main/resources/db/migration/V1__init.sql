-- V1__init.sql

-- User Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `social_id` VARCHAR(255) NOT NULL UNIQUE,
    `provider` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(255) UNIQUE,
    `profile_img` VARCHAR(255),
    `profile_img_thumb` VARCHAR(255),
    `tier` VARCHAR(255) DEFAULT 'BRONZE',
    `league_point` INT DEFAULT 0,
    `league_group_id` BIGINT,
    `streak_current` INT DEFAULT 0,
    `streak_max` INT DEFAULT 0,
    `max_league` VARCHAR(255),
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(6) NOT NULL
);

-- Problem Table
CREATE TABLE IF NOT EXISTS `problem` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `source` VARCHAR(255) NOT NULL,
    `external_id` VARCHAR(255) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `tier` VARCHAR(255) NOT NULL,
    `url` TEXT NOT NULL
);

-- SubmissionLog Table
CREATE TABLE IF NOT EXISTS `submission_log` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `problem_id` BIGINT NOT NULL,
    `source_type` VARCHAR(255),
    `room_id` BIGINT,
    `problem_title` VARCHAR(255),
    `problem_tier` VARCHAR(255),
    `code` TEXT,
    `result` VARCHAR(255),
    `memory` INT,
    `execution_time` INT,
    `language` VARCHAR(255),
    `submitted_at` DATETIME(6),
    CONSTRAINT `fk_submission_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `fk_submission_problem` FOREIGN KEY (`problem_id`) REFERENCES `problem` (`id`)
);
