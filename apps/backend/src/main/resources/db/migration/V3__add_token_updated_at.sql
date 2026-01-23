-- Add extension_token_updated_at column to users table
ALTER TABLE users ADD COLUMN extension_token_updated_at DATETIME(6);
