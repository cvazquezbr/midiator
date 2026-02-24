
-- Drop existing tables to recreate with new schema (as requested to follow the document strictly)
DROP TABLE IF EXISTS linkedin_generated_comments;
DROP TABLE IF EXISTS linkedin_discovered_posts;
DROP TABLE IF EXISTS linkedin_discovery_sessions;

-- Sessões de descoberta (agrupam uma rodada de busca)
CREATE TABLE linkedin_discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  source_post_id TEXT,                    -- ID do post publicado no LinkedIn
  source_post_content TEXT,               -- Conteúdo do post original
  extracted_hashtags JSONB,               -- Hashtags e temas extraídos pelo Gemini
  status TEXT DEFAULT 'pending',          -- pending | searching | scoring | ready | completed | error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts descobertos e seu status de curadoria
CREATE TABLE linkedin_discovered_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES linkedin_discovery_sessions(id) ON DELETE CASCADE,
  linkedin_post_id TEXT NOT NULL,
  post_content TEXT,
  post_author_name TEXT,
  post_author_title TEXT,
  post_author_urn TEXT,
  post_url TEXT,
  post_published_at TIMESTAMPTZ,
  engagement_likes INT DEFAULT 0,
  engagement_comments INT DEFAULT 0,
  relevance_score INT,                    -- 0-100, calculado pelo Gemini
  opportunity_score INT,                  -- 0-100, calculado pelo Gemini
  final_score INT,                        -- score composto
  relation_type TEXT,                     -- complementar | debate | caso_de_uso | tendencia
  score_justification TEXT,
  user_decision TEXT DEFAULT 'pending',   -- pending | approved | rejected
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários gerados e seu status
CREATE TABLE linkedin_generated_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovered_post_id UUID REFERENCES linkedin_discovered_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  generated_text TEXT NOT NULL,
  final_text TEXT,                        -- texto após edição do usuário
  generation_version INT DEFAULT 1,       -- incrementa a cada regeneração
  status TEXT DEFAULT 'pending',          -- pending | approved | published | discarded
  linkedin_comment_id TEXT,              -- ID retornado pela API após publicação
  published_at TIMESTAMPTZ,
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
