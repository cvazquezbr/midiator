-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for users table
DROP TRIGGER IF EXISTS set_timestamp ON users;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    settings_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for settings table
DROP TRIGGER IF EXISTS set_timestamp ON settings;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment indicating successful execution
-- This is a simple way to verify the script ran without errors
COMMENT ON TABLE users IS 'Users table created successfully';
COMMENT ON TABLE settings IS 'Settings table created successfully';

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    campaign_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id for faster lookups of a user's campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Re-use the existing trigger function for the new table
DROP TRIGGER IF EXISTS set_timestamp ON campaigns;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment to verify execution
COMMENT ON TABLE campaigns IS 'Campaigns table created successfully';

-- Table for LinkedIn Post Schedules
CREATE TABLE IF NOT EXISTS linkedin_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL, -- Can be null if no campaign is associated
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- e.g., 'scheduled', 'published', 'failed'
    scheduled_at TIMESTAMPTZ NOT NULL,
    user_selected_time VARCHAR(255), -- To store the user's original timezone/format selection
    post_content JSONB, -- Storing title, content, cta, hashtags etc.
    linkedin_post_id VARCHAR(255), -- The ID returned by LinkedIn API
    linkedin_post_url VARCHAR(2048), -- The full URL to the post on LinkedIn
    error_message TEXT, -- To log any errors during publishing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_linkedin_schedules_user_id ON linkedin_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_schedules_status ON linkedin_schedules(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_schedules_scheduled_at ON linkedin_schedules(scheduled_at);

-- Trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS set_timestamp ON linkedin_schedules;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON linkedin_schedules
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Comment to verify that the script was executed
COMMENT ON TABLE linkedin_schedules IS 'Tabela para armazenar agendamentos de posts no LinkedIn.';

ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_access_token VARCHAR(2048);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_access_token_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_refresh_token VARCHAR(1024);
