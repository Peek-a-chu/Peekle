-- Set a default fallback value for any existing null profile images so the NOT NULL constraint can apply

ALTER TABLE users
    ADD COLUMN profile_img_type VARCHAR(20) DEFAULT 'DEFAULT' NOT NULL;
UPDATE users
SET profile_img_type = 'CUSTOM'
WHERE profile_img IS NOT NULL;

UPDATE users 
SET profile_img = CONCAT('https://api.dicebear.com/9.x/bottts-neutral/svg?seed=', CAST(nickname AS CHAR))
WHERE profile_img IS NULL;

UPDATE users 
SET profile_img_thumb = CONCAT('https://api.dicebear.com/9.x/bottts-neutral/svg?seed=', CAST(nickname AS CHAR))
WHERE profile_img_thumb IS NULL;

-- Add the NOT NULL constraints and profile_img_type column
ALTER TABLE users 
    MODIFY COLUMN profile_img VARCHAR(255) NOT NULL,
    MODIFY COLUMN profile_img_thumb VARCHAR(255) NOT NULL;