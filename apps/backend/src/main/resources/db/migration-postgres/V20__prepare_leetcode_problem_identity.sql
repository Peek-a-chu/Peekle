ALTER TABLE problems
    ADD COLUMN IF NOT EXISTS english_title VARCHAR(255);

DO $$
DECLARE
    external_id_unique_constraint TEXT;
BEGIN
    FOR external_id_unique_constraint IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
            ON a.attrelid = c.conrelid
            AND a.attname = 'external_id'
        WHERE c.conrelid = 'problems'::regclass
            AND c.contype = 'u'
            AND c.conkey = ARRAY[a.attnum]::SMALLINT[]
    LOOP
        EXECUTE format('ALTER TABLE problems DROP CONSTRAINT %I', external_id_unique_constraint);
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_problems_source_external_id'
    ) THEN
        ALTER TABLE problems
            ADD CONSTRAINT uk_problems_source_external_id
            UNIQUE (source, external_id);
    END IF;
END $$;
