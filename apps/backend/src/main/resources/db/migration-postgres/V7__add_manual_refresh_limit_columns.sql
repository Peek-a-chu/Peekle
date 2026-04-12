ALTER TABLE users
    ADD COLUMN IF NOT EXISTS manual_rec_refresh_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manual_rec_refresh_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_manual_rec_refresh_count'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_manual_rec_refresh_count
            CHECK (manual_rec_refresh_count >= 0);
    END IF;
END $$;
