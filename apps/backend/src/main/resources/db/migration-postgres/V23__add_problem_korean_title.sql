ALTER TABLE problems
    ADD COLUMN IF NOT EXISTS korean_title VARCHAR(255);

UPDATE problems p
SET external_id = r.problem_number::TEXT
FROM leetcode_problem_ratings r
WHERE p.source = 'LEETCODE'
    AND p.external_id = r.title_slug
    AND r.problem_number IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM problems existing
        WHERE existing.source = p.source
            AND existing.external_id = r.problem_number::TEXT
    );
