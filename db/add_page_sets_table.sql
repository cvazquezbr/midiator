-- up.sql
CREATE TABLE page_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    page_set_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_sets_user_id ON page_sets(user_id);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON page_sets
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
