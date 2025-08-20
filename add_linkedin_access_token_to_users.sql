ALTER TABLE users ADD COLUMN linkedin_access_token VARCHAR(2048);
ALTER TABLE users ADD COLUMN linkedin_access_token_expiry TIMESTAMPTZ;
