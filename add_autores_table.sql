-- Autores Table
CREATE TABLE IF NOT EXISTS autores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    autor_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id for faster lookups of a user's autores
CREATE INDEX IF NOT EXISTS idx_autores_user_id ON autores(user_id);

-- Trigger for autores table
DROP TRIGGER IF EXISTS set_timestamp ON autores;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON autores
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment to verify execution
COMMENT ON TABLE autores IS 'Autores table created successfully';

-- Add autor_id to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS autor_id INTEGER REFERENCES autores(id) ON DELETE SET NULL;

-- Index on autor_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_autor_id ON campaigns(autor_id);
