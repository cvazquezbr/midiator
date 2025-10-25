-- Migration to create the campaign_shares table

CREATE TABLE IF NOT EXISTS campaign_shares (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campaign_id, shared_with_user_id)
);

-- Index on shared_with_user_id for faster lookups of campaigns shared with a user
CREATE INDEX IF NOT EXISTS idx_campaign_shares_shared_with_user_id ON campaign_shares(shared_with_user_id);

-- Trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS set_timestamp ON campaign_shares;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON campaign_shares
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment to verify execution
COMMENT ON TABLE campaign_shares IS 'Table to manage campaign sharing';
