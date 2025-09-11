import { query } from '../api/db.js';
import { handleRunScheduler } from '../api/schedule.js';
import { describe, it, expect, vi } from 'vitest';

// Mock the publishPost function
vi.mock('../api/schedule.js', async () => {
  const originalModule = await vi.importActual('../api/schedule.js');
  return {
    ...originalModule,
    publishPost: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'urn:li:share:12345' }),
    }),
  };
});

const createMockResponse = () => {
    let res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    res.end = () => {};
    return res;
};

const createMockRequest = (headers = {}) => ({
    method: 'GET',
    headers: {
        'x-vercel-cron-secret': process.env.VERCEL_CRON_SECRET,
        ...headers,
    },
});

describe('Scheduler Success Test', () => {
    it('should publish a scheduled post successfully', async () => {
        // Create a test user
        const { rows: users } = await query(
            "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *",
            ['test@example.com', 'password', 'Test User']
        );
        const testUser = users[0];

        // Create a test campaign
        const { rows: campaigns } = await query(
            "INSERT INTO campaigns (user_id, name, campaign_data) VALUES ($1, $2, $3) RETURNING *",
            [testUser.id, 'Test Campaign', { images: [] }]
        );
        const testCampaign = campaigns[0];

        // Create a scheduled post
        const scheduled_at = new Date(Date.now() - 60000).toISOString();
        const { rows: schedules } = await query(
            `INSERT INTO linkedin_schedules (user_id, campaign_id, scheduled_at, post_content, status)
             VALUES ($1, $2, $3, $4, 'scheduled') RETURNING *`,
            [testUser.id, testCampaign.id, scheduled_at, { titulo: 'Test Post', conteudo: 'Test Content', cta: '#test', hashtags: [] }]
        );
        const testSchedule = schedules[0];

        // Add linkedin access token to user
        await query(
            "UPDATE users SET linkedin_access_token = $1 WHERE id = $2",
            ['test_token', testUser.id]
        );
        const req = createMockRequest();
        const res = createMockResponse();

        await handleRunScheduler(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Published: 1');

        // Verify the post status in the database
        const { rows } = await query("SELECT status FROM linkedin_schedules WHERE id = $1", [testSchedule.id]);
        expect(rows[0].status).toBe('published');
    });
});
