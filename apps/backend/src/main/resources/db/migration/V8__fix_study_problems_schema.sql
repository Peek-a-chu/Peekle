-- V8__fix_study_problems_schema.sql
-- Fix study_problems table schema to support custom problems

-- Make problem_id nullable (for custom problems)
ALTER TABLE study_problems MODIFY problem_id BIGINT NULL;

-- Ensure custom columns exist (if using Hibernate update, they might verify, but explicit migration is safer)
-- Using MySQL compatible syntax that usually doesn't error if column exists is tricky without IF NOT EXISTS (MySQL 8.0+)
-- Assuming MySQL 8.0 based on project recency
ALTER TABLE study_problems ADD COLUMN custom_title VARCHAR(255);
ALTER TABLE study_problems ADD COLUMN custom_link VARCHAR(255);
