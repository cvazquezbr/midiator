CREATE TABLE palettes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    colors JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_palettes_user_id ON palettes(user_id);

COMMENT ON TABLE palettes IS 'Stores user-created color palettes.';
COMMENT ON COLUMN palettes.user_id IS 'Foreign key to the user who owns the palette.';
COMMENT ON COLUMN palettes.name IS 'The name of the color palette.';
COMMENT ON COLUMN palettes.colors IS 'A JSONB array of color strings, e.g., ["#RRGGBB", ...].';

-- Additionally, add a column to the campaigns table to reference a palette
ALTER TABLE campaigns ADD COLUMN palette_id INTEGER REFERENCES palettes(id) ON DELETE SET NULL;
COMMENT ON COLUMN campaigns.palette_id IS 'Optional foreign key to a saved color palette.';
