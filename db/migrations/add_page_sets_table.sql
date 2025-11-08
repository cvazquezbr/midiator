CREATE TABLE page_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    page_set_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_page_sets_user_id ON page_sets(user_id);

COMMENT ON TABLE page_sets IS 'Stores user-created page sets (templates).';
COMMENT ON COLUMN page_sets.user_id IS 'Foreign key to the user who owns the page set.';
COMMENT ON COLUMN page_sets.name IS 'The name of the page set.';
COMMENT ON COLUMN page_sets.page_set_data IS 'A JSONB object containing the full page set data structure.';
