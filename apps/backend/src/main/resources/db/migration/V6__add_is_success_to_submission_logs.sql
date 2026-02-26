ALTER TABLE submission_logs ADD COLUMN is_success BOOLEAN;

-- Update existing records based on result
UPDATE submission_logs SET is_success = true WHERE result = '맞았습니다!!';
UPDATE submission_logs SET is_success = false WHERE result != '맞았습니다!!' AND result IS NOT NULL;
