-- Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);

-- Trigger for prompts table
DROP TRIGGER IF EXISTS set_timestamp ON prompts;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON prompts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add a comment indicating successful execution
COMMENT ON TABLE prompts IS 'Prompts table created successfully';
