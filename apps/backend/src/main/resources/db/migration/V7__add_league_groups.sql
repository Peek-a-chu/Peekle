-- V7__add_league_groups.sql

-- League Group Table (league_groups)
CREATE TABLE IF NOT EXISTS `league_groups` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tier` VARCHAR(20) NOT NULL,
    `season_week` INT NOT NULL,
    `created_at` DATETIME(6) NOT NULL
);

-- Update users table default league
ALTER TABLE `users` ALTER `league` SET DEFAULT 'STONE';

-- Add Foreign Key constraint (league_group_id already exists in V1/V2 context)
ALTER TABLE `users` ADD CONSTRAINT `fk_user_league_group` FOREIGN KEY (`league_group_id`) REFERENCES `league_groups` (`id`);
