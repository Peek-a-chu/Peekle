-- Set a default fallback value for any existing null profile images so the NOT NULL constraint can apply
UPDATE users 
SET profile_img = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || nickname 
WHERE profile_img IS NULL;

UPDATE users 
SET profile_img_thumb = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || nickname 
WHERE profile_img_thumb IS NULL;

-- Add the NOT NULL constraints
ALTER TABLE users 
    MODIFY COLUMN profile_img VARCHAR(255) NOT NULL,
    MODIFY COLUMN profile_img_thumb VARCHAR(255) NOT NULL;
