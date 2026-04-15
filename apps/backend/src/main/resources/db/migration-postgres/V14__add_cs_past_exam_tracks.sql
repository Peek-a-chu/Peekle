ALTER TABLE cs_domain_tracks
    ADD COLUMN IF NOT EXISTS learning_mode VARCHAR(20) NOT NULL DEFAULT 'CURRICULUM',
    ADD COLUMN IF NOT EXISTS exam_year SMALLINT;

ALTER TABLE cs_domain_tracks
    DROP CONSTRAINT IF EXISTS chk_cs_domain_tracks_learning_mode;
ALTER TABLE cs_domain_tracks
    ADD CONSTRAINT chk_cs_domain_tracks_learning_mode
        CHECK (learning_mode IN ('CURRICULUM', 'PAST_EXAM'));

ALTER TABLE cs_domain_tracks
    DROP CONSTRAINT IF EXISTS chk_cs_domain_tracks_exam_year;
ALTER TABLE cs_domain_tracks
    ADD CONSTRAINT chk_cs_domain_tracks_exam_year
        CHECK (
            (learning_mode = 'CURRICULUM' AND exam_year IS NULL)
            OR (learning_mode = 'PAST_EXAM' AND exam_year BETWEEN 2020 AND 2025)
        );

CREATE INDEX IF NOT EXISTS idx_cs_domain_tracks_learning_mode_exam_year
    ON cs_domain_tracks (learning_mode, exam_year);

DO $$
DECLARE
    v_domain_id INT := 10;
    v_year INT;
    v_track_id BIGINT;
    v_next_track_no SMALLINT;
    v_round_limit SMALLINT;
    v_round SMALLINT;
BEGIN
    INSERT INTO cs_domains (id, name)
    SELECT v_domain_id, '정보처리기사 기출'
    WHERE NOT EXISTS (
        SELECT 1
        FROM cs_domains
        WHERE id = v_domain_id
    );

    FOR v_year IN 2020..2025 LOOP
        IF EXISTS (
            SELECT 1
            FROM cs_domain_tracks
            WHERE domain_id = v_domain_id
              AND learning_mode = 'PAST_EXAM'
              AND exam_year = v_year
        ) THEN
            CONTINUE;
        END IF;

        SELECT COALESCE(MAX(track_no), 0) + 1
        INTO v_next_track_no
        FROM cs_domain_tracks
        WHERE domain_id = v_domain_id;

        INSERT INTO cs_domain_tracks (domain_id, track_no, name, learning_mode, exam_year)
        VALUES (
            v_domain_id,
            v_next_track_no,
            v_year || '년 정보처리기사 기출',
            'PAST_EXAM',
            v_year
        )
        RETURNING id INTO v_track_id;

        v_round_limit := CASE WHEN v_year = 2020 THEN 4 ELSE 3 END;
        FOR v_round IN 1..v_round_limit LOOP
            INSERT INTO cs_stages (track_id, stage_no)
            VALUES (v_track_id, v_round);
        END LOOP;
    END LOOP;
END $$;
