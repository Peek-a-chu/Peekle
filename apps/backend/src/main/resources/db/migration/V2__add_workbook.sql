-- V2__add_workbook.sql
-- Workbook 관련 테이블 추가

-- ========================================
-- 1. Workbooks Table
-- ========================================
CREATE TABLE IF NOT EXISTS `workbooks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `creator_id` BIGINT NOT NULL,
    `bookmark_count` INT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_workbook_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`)
);

-- ========================================
-- 2. Workbook Problems Table (Join table for Workbook and Problem)
-- ========================================
CREATE TABLE IF NOT EXISTS `workbook_problems` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `workbook_id` BIGINT NOT NULL,
    `problem_id` BIGINT NOT NULL,
    `order_index` INT NOT NULL,
    CONSTRAINT `fk_workbook_problem_workbook` FOREIGN KEY (`workbook_id`) REFERENCES `workbooks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_workbook_problem_problem` FOREIGN KEY (`problem_id`) REFERENCES `problems` (`id`) ON DELETE CASCADE
);

-- ========================================
-- 3. Workbook Bookmarks Table
-- ========================================
CREATE TABLE IF NOT EXISTS `workbook_bookmarks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `workbook_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `created_at` DATETIME(6) NOT NULL,
    UNIQUE (`workbook_id`, `user_id`),
    CONSTRAINT `fk_workbook_bookmark_workbook` FOREIGN KEY (`workbook_id`) REFERENCES `workbooks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_workbook_bookmark_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX `idx_workbooks_creator` ON `workbooks` (`creator_id`);
CREATE INDEX `idx_workbook_problems_workbook` ON `workbook_problems` (`workbook_id`);
CREATE INDEX `idx_workbook_bookmarks_user` ON `workbook_bookmarks` (`user_id`);
