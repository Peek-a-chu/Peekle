-- Add problem_identifier to submission_log table (V1 table name is submission_log)
ALTER TABLE `submission_log` ADD COLUMN `external_id` VARCHAR(255);
