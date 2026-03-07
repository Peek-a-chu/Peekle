CREATE TABLE IF NOT EXISTS `study_problem_drafts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_member_id` BIGINT NOT NULL,
    `study_problem_id` BIGINT NOT NULL,
    `code` LONGTEXT,
    `language` VARCHAR(50),
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,
    CONSTRAINT `fk_study_problem_draft_member`
        FOREIGN KEY (`study_member_id`) REFERENCES `study_members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_study_problem_draft_problem`
        FOREIGN KEY (`study_problem_id`) REFERENCES `study_problems` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uk_study_problem_draft_member_problem`
        UNIQUE (`study_member_id`, `study_problem_id`)
);

CREATE INDEX `idx_study_problem_draft_member` ON `study_problem_drafts` (`study_member_id`);
CREATE INDEX `idx_study_problem_draft_problem` ON `study_problem_drafts` (`study_problem_id`);
