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
