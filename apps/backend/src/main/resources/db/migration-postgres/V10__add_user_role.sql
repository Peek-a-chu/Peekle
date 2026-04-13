ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20);

UPDATE users
SET role = 'USER'
WHERE role IS NULL;

ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'USER';

ALTER TABLE users
    ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role
                CHECK (role IN ('USER', 'ADMIN'));
    END IF;
END $$;
