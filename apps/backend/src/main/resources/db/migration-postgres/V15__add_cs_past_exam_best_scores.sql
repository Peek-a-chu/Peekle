CREATE TABLE IF NOT EXISTS cs_past_exam_best_scores (
    user_id BIGINT NOT NULL,
    exam_year SMALLINT NOT NULL,
    exam_round SMALLINT NOT NULL,
    best_score INT NOT NULL,
    achieved_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_cs_past_exam_best_scores
        PRIMARY KEY (user_id, exam_year, exam_round),
    CONSTRAINT fk_cs_past_exam_best_scores_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_cs_past_exam_best_scores_year
        CHECK (exam_year BETWEEN 2020 AND 2025),
    CONSTRAINT chk_cs_past_exam_best_scores_round
        CHECK (
            (exam_year = 2020 AND exam_round BETWEEN 1 AND 4)
            OR (exam_year BETWEEN 2021 AND 2025 AND exam_round BETWEEN 1 AND 3)
        ),
    CONSTRAINT chk_cs_past_exam_best_scores_score
        CHECK (best_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_cs_past_exam_best_scores_user_year
    ON cs_past_exam_best_scores (user_id, exam_year);

WITH scored_attempts AS (
    SELECT
        log.user_id AS user_id,
        track.exam_year AS exam_year,
        log.stage_no AS exam_round,
        CAST(ROUND((log.correct_count * 100.0) / NULLIF(log.total_count, 0)) AS INT) AS score,
        log.completed_at AS completed_at,
        ROW_NUMBER() OVER (
            PARTITION BY log.user_id, track.exam_year, log.stage_no
            ORDER BY
                CAST(ROUND((log.correct_count * 100.0) / NULLIF(log.total_count, 0)) AS INT) DESC,
                log.completed_at DESC
        ) AS rn
    FROM cs_stage_attempt_logs log
    JOIN cs_domain_tracks track
      ON track.domain_id = log.domain_id
     AND track.track_no = log.track_no
    WHERE log.is_review = FALSE
      AND log.total_count > 0
      AND track.learning_mode = 'PAST_EXAM'
      AND track.exam_year IS NOT NULL
),
best_attempts AS (
    SELECT
        user_id,
        exam_year,
        exam_round,
        score,
        completed_at
    FROM scored_attempts
    WHERE rn = 1
)
INSERT INTO cs_past_exam_best_scores (
    user_id,
    exam_year,
    exam_round,
    best_score,
    achieved_at,
    created_at,
    updated_at
)
SELECT
    user_id,
    exam_year,
    exam_round,
    score,
    completed_at,
    NOW(),
    NOW()
FROM best_attempts
ON CONFLICT (user_id, exam_year, exam_round) DO UPDATE
SET
    best_score = GREATEST(cs_past_exam_best_scores.best_score, EXCLUDED.best_score),
    achieved_at = CASE
        WHEN EXCLUDED.best_score > cs_past_exam_best_scores.best_score THEN EXCLUDED.achieved_at
        WHEN EXCLUDED.best_score = cs_past_exam_best_scores.best_score
             AND EXCLUDED.achieved_at > cs_past_exam_best_scores.achieved_at THEN EXCLUDED.achieved_at
        ELSE cs_past_exam_best_scores.achieved_at
    END,
    updated_at = NOW();
