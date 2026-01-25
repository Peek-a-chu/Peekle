-- Add extension_token column to users table
ALTER TABLE users ADD COLUMN extension_token VARCHAR(100);
ALTER TABLE users ADD CONSTRAINT uq_users_extension_token UNIQUE (extension_token);
