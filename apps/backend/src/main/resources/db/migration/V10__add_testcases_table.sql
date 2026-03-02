-- V10__add_testcases_table.sql

CREATE TABLE IF NOT EXISTS `testcases` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_room_id` BIGINT NOT NULL,
    `study_problem_id` BIGINT NOT NULL,
    `input` TEXT,
    `expected_output` TEXT,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_testcases_room` FOREIGN KEY (`study_room_id`) REFERENCES `study_rooms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_testcases_study_problem` FOREIGN KEY (`study_problem_id`) REFERENCES `study_problems` (`id`) ON DELETE CASCADE
);

CREATE INDEX `idx_testcases_room_problem` ON `testcases` (`study_room_id`, `study_problem_id`);
