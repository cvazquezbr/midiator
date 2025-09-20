-- Palettes Table
CREATE TABLE IF NOT EXISTS palettes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    colors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id for faster lookups of a user's palettes
CREATE INDEX IF NOT EXISTS idx_palettes_user_id ON palettes(user_id);

-- Trigger for palettes table
DROP TRIGGER IF EXISTS set_timestamp ON palettes;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON palettes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment to verify execution
COMMENT ON TABLE palettes IS 'Palettes table created successfully';

-- Add palette_id to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS palette_id INTEGER REFERENCES palettes(id) ON DELETE SET NULL;

-- Index on palette_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_palette_id ON campaigns(palette_id);
