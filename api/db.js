import pg from 'pg';
import { newDb } from 'pg-mem';

const connectionString = process.env.POSTGRES_URL;
const isDev = process.env.NODE_ENV !== 'production';

let pool;

// This is a simplified schema for the in-memory DB, based on setup.sql
const setupInMemoryDb = () => {
  console.log("Setting up in-memory PostgreSQL database for development...");
  const db = newDb();

  // pg-mem doesn't support all PostgreSQL features, so we use a simplified schema.
  // Triggers and some functions like gen_random_uuid are omitted.
  db.public.query(`
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        uuid UUID,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user' NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        google_access_token TEXT,
        google_refresh_token TEXT,
        linkedin_access_token VARCHAR(2048),
        linkedin_access_token_expiry TIMESTAMPTZ,
        linkedin_refresh_token VARCHAR(1024),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        settings_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        campaign_data JSONB,
        autor_id INTEGER,
        persona_id INTEGER,
        palette_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE linkedin_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        scheduled_at TIMESTAMPTZ NOT NULL,
        user_selected_time VARCHAR(255),
        post_content JSONB,
        linkedin_post_id VARCHAR(255),
        linkedin_post_url VARCHAR(2048),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("In-memory database setup complete.");
  return db;
};

const getPool = () => {
  if (!pool) {
    if (isDev) {
      // Use in-memory database for development
      pool = setupInMemoryDb();
    } else {
      // Use real PostgreSQL for production
      if (!connectionString) {
        throw new Error('Database configuration is missing. The POSTGRES_URL environment variable is not set for production.');
      }
      console.log("Creating new PostgreSQL connection pool for production.");
      pool = new pg.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 2000,
      });
    }
  }
  return pool;
};

export const query = (text, params) => {
  const dbPool = getPool();
  // pg-mem has a `query` method on the main object, pg.Pool has it on the pool itself.
  if (isDev) {
      return dbPool.public.query(text, params);
  }
  return dbPool.query(text, params);
};

export default { query };