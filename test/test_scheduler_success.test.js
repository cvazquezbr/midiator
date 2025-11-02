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
        const testPost = {
            id: 101,
            user_id: 1,
            linkedin_access_token: 'test_token',
            payload: {
                content: 'Test Content',
            },
            author: null,
            target_id: '1',
            target_type: 'person',
            scheduled_at: new Date().toISOString(),
        };

        // Mock database responses
        // 1. For the SELECT query which now has a JOIN
        query.mockResolvedValueOnce({ rows: [testPost] });
        // 2. For the UPDATE query
        query.mockResolvedValueOnce({ rows: [] });


        // Mock fetch response for createPost
        fetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 'urn:li:share:12345' })),
            json: () => Promise.resolve({ id: 'urn:li:share:12345' }),
        });

        const result = await handleRunScheduler();

        expect(result.ok).toBe(true);

        // Verify that the proxy was called to create the post
        expect(fetch).toHaveBeenCalled();
        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(fetchBody.action).toBe('createPost');
        expect(fetchBody.payload.commentary).toBe('Test Content');


        // Verify that the status was updated to 'sent'
        const updateQueryCall = query.mock.calls.find(call => call[0].includes('UPDATE linkedin_schedules'));
        expect(updateQueryCall).toBeDefined();
        expect(updateQueryCall[0]).toContain("SET status = $1");
        expect(updateQueryCall[1][0]).toBe('sent');
        expect(updateQueryCall[1][1]).toBe(testPost.id);
    });
});
