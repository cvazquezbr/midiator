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
