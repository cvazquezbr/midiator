CREATE TABLE briefing_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_briefing_templates_updated_at
BEFORE UPDATE ON briefing_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add a unique constraint to ensure a user can only have one template
ALTER TABLE briefing_templates
ADD CONSTRAINT unique_user_template UNIQUE (user_id);