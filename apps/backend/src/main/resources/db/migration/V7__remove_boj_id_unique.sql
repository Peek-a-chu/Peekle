-- V7__remove_boj_id_unique.sql
-- Remove unique constraint from boj_id column in users table

ALTER TABLE `users` DROP INDEX `boj_id`;
