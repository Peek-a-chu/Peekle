-- Add result column to submission_logs table
ALTER TABLE submission_logs
ADD COLUMN result VARCHAR(50) NULL COMMENT '제출 결과 (맞았습니다, 틀렸습니다, 런타임 에러 등)';
