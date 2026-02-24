
-- Tabela para sessões de descoberta de engajamento no LinkedIn
CREATE TABLE IF NOT EXISTS linkedin_discovery_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_post_id VARCHAR(255),
    source_post_content TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'searching', 'ready', 'error'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para posts descobertos durante uma sessão
CREATE TABLE IF NOT EXISTS linkedin_discovered_posts (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES linkedin_discovery_sessions(id) ON DELETE CASCADE,
    post_id VARCHAR(255),
    post_content TEXT,
    post_url VARCHAR(2048),
    post_author_name VARCHAR(255),
    final_score INTEGER,
    user_decision VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para comentários gerados para posts aprovados
CREATE TABLE IF NOT EXISTS linkedin_generated_comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discovered_post_id INTEGER NOT NULL REFERENCES linkedin_discovered_posts(id) ON DELETE CASCADE,
    generated_text TEXT,
    final_text TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'posted'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gatilhos para atualizar updated_at
DROP TRIGGER IF EXISTS set_timestamp_discovery_sessions ON linkedin_discovery_sessions;
CREATE TRIGGER set_timestamp_discovery_sessions
BEFORE UPDATE ON linkedin_discovery_sessions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_generated_comments ON linkedin_generated_comments;
CREATE TRIGGER set_timestamp_generated_comments
BEFORE UPDATE ON linkedin_generated_comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_user_id ON linkedin_discovery_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_posts_session_id ON linkedin_discovered_posts(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_comments_user_id ON linkedin_generated_comments(user_id);
