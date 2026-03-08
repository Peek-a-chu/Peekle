ALTER TABLE submission_logs
ADD COLUMN study_problem_id BIGINT NULL;

CREATE INDEX idx_submission_study_problem
ON submission_logs (study_problem_id);

ALTER TABLE submission_logs
ADD CONSTRAINT fk_submission_study_problem
FOREIGN KEY (study_problem_id) REFERENCES study_problems(id);
