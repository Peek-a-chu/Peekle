-- V2: Add problem_tags junction table for Problem-Tag many-to-many relationship

CREATE TABLE IF NOT EXISTS `problem_tags` (
    `problem_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,
    PRIMARY KEY (`problem_id`, `tag_id`),
    CONSTRAINT `fk_problem_tags_problem` FOREIGN KEY (`problem_id`) REFERENCES `problems` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_problem_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
);

CREATE INDEX `idx_problem_tags_tag_id` ON `problem_tags` (`tag_id`);
