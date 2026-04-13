ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) NOT NULL DEFAULT 'python';

UPDATE users
SET preferred_language = 'python';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_preferred_language'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT chk_users_preferred_language;
    END IF;
    ALTER TABLE users
        ADD CONSTRAINT chk_users_preferred_language
            CHECK (preferred_language IN ('python', 'java', 'cpp'));
END $$;
