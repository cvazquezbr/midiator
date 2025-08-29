-- Personas Table
CREATE TABLE IF NOT EXISTS personas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    persona_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id for faster lookups of a user's personas
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);

-- Trigger for personas table
DROP TRIGGER IF EXISTS set_timestamp ON personas;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment to verify execution
COMMENT ON TABLE personas IS 'Personas table created successfully';

-- Add persona_id to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS persona_id INTEGER REFERENCES personas(id) ON DELETE SET NULL;

-- Index on persona_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_persona_id ON campaigns(persona_id);
