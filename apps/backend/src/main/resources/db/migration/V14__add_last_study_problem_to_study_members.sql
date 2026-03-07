ALTER TABLE `study_members`
    ADD COLUMN `last_study_problem_id` BIGINT NULL;

ALTER TABLE `study_members`
    ADD CONSTRAINT `fk_study_member_last_problem`
    FOREIGN KEY (`last_study_problem_id`) REFERENCES `study_problems` (`id`) ON DELETE SET NULL;

CREATE INDEX `idx_study_member_last_problem` ON `study_members` (`last_study_problem_id`);
