-- Add additional short-answer aliases for requirement terminology questions
INSERT INTO cs_question_short_answers (question_id, answer_text, normalized_answer, is_primary)
VALUES
    (10109, '기능적 요구사항', '기능적요구사항', FALSE),
    (10110, '비기능적 요구사항', '비기능적요구사항', FALSE)
ON CONFLICT (question_id, normalized_answer) DO UPDATE
SET answer_text = EXCLUDED.answer_text,
    is_primary = EXCLUDED.is_primary;
