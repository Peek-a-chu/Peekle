ALTER TABLE cs_question_short_answers
    ADD COLUMN IF NOT EXISTS blank_index SMALLINT;

UPDATE cs_question_short_answers
SET blank_index = 1
WHERE blank_index IS NULL OR blank_index < 1;

WITH ranked_multi_blank_answers AS (
    SELECT
        sa.id,
        ROW_NUMBER() OVER (PARTITION BY sa.question_id ORDER BY sa.is_primary DESC, sa.id ASC) AS blank_no
    FROM cs_question_short_answers sa
    JOIN cs_questions q ON q.id = sa.question_id
    WHERE q.question_type = 'SHORT_ANSWER'
      AND q.grading_mode IN ('MULTI_BLANK_ORDERED', 'MULTI_BLANK_UNORDERED', 'ORDERING')
)
UPDATE cs_question_short_answers sa
SET blank_index = ranked.blank_no
FROM ranked_multi_blank_answers ranked
WHERE sa.id = ranked.id;

ALTER TABLE cs_question_short_answers
    ALTER COLUMN blank_index SET DEFAULT 1;

ALTER TABLE cs_question_short_answers
    ALTER COLUMN blank_index SET NOT NULL;

ALTER TABLE cs_question_short_answers
    DROP CONSTRAINT IF EXISTS uk_cs_question_short_answers_question_normalized;

ALTER TABLE cs_question_short_answers
    DROP CONSTRAINT IF EXISTS uk_cs_question_short_answers_question_blank_normalized;

ALTER TABLE cs_question_short_answers
    ADD CONSTRAINT uk_cs_question_short_answers_question_blank_normalized
        UNIQUE (question_id, blank_index, normalized_answer);

CREATE INDEX IF NOT EXISTS idx_cs_question_short_answers_question_blank
    ON cs_question_short_answers (question_id, blank_index);
