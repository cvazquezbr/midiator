CREATE TABLE IF NOT EXISTS linkedin_post_analytics (
    id SERIAL PRIMARY KEY,
    publication_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    engagement REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (publication_id) REFERENCES linkedin_schedules(id) ON DELETE CASCADE,
    UNIQUE (publication_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_post_analytics_publication_date
ON linkedin_post_analytics (publication_id, snapshot_date);
