import { handleRunScheduler } from '../api/cron/linkedin.js';
import { query } from '../api/db.js';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../api/db.js', () => ({
    query: vi.fn(),
}));

// Mock node-fetch
vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));

const createMockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

const createMockRequest = () => ({
    method: 'GET',
    headers: {},
});

import fetch from 'node-fetch';

describe('Scheduler Success Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should publish a scheduled post successfully', async () => {
        const testUser = { id: 1, linkedin_access_token: 'test_token' };
        const testSchedule = {
            id: 101,
            user_id: testUser.id,
            post_content: { titulo: 'Test Post', conteudo: 'Test Content', cta: '#test', hashtags: [] },
            linkedin_access_token: testUser.linkedin_access_token,
        };

        // Mock database responses
        query.mockResolvedValue({ rows: [testSchedule] });

        // Mock fetch response for createPost
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: 'urn:li:share:12345' }),
        });

        const req = createMockRequest();
        const res = createMockResponse();

        await handleRunScheduler(req, res);

        expect(fetch).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Published: 1') });

        // Verify that the status was updated to 'published'
        const updateQuery = query.mock.calls.find(call => call[0].includes('UPDATE linkedin_schedules'));
        expect(updateQuery).toBeDefined();
        expect(updateQuery[0]).toContain("status = 'published'");
    });
});
