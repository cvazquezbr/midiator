-- Add a parent_id column to linkedin_schedules to link follow-up posts to a main post.
ALTER TABLE linkedin_schedules
ADD COLUMN parent_id INTEGER REFERENCES linkedin_schedules(id) ON DELETE SET NULL;

-- Add an index for faster lookups on parent_id
CREATE INDEX IF NOT EXISTS idx_linkedin_schedules_parent_id ON linkedin_schedules(parent_id);

-- Comment to verify that the script was executed
COMMENT ON COLUMN linkedin_schedules.parent_id IS 'ID do post original (pai) para posts de follow-up.';
