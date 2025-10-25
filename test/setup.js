import '@testing-library/jest-dom';
import { newDb } from 'pg-mem';
import { vi } from 'vitest';

const db = newDb();

// Create the users table
db.public.query(`
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        sub TEXT UNIQUE, -- Added for consistency with how user is identified in tests
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        linkedin_access_token VARCHAR(2048),
        linkedin_access_token_expiry TIMESTAMPTZ,
        linkedin_refresh_token VARCHAR(1024)
    );
`);

// Create the campaigns table
db.public.query(`
    CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255),
        campaign_data JSONB
    );
`);

// Create the linkedin_schedules table
db.public.query(`
    CREATE TABLE linkedin_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        campaign_id INTEGER REFERENCES campaigns(id),
        scheduled_at TIMESTAMPTZ,
        user_selected_time VARCHAR(255),
        post_content JSONB,
        status VARCHAR(255),
        linkedin_post_id VARCHAR(255),
        linkedin_post_url VARCHAR(2048),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
`);

const backup = db.backup();

vi.mock('../api/db.js', () => ({
    query: (sql, params) => db.public.query(sql, params),
    default: db,
}));


global.beforeEach(() => {
    backup.restore();
});
