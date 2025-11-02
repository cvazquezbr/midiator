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
                targetId: '1',
                targetType: 'person',
            },
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
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

        // Mock the response object
        const mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        // Verify that the proxy was called to create the post
        expect(fetch).toHaveBeenCalled();
        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(fetchBody.accessToken).toBe('test_token');
        expect(fetchBody.payload.commentary).toBe('Test Content');


        // Verify that the status, post_id, and post_url were updated
        const updateQueryCall = query.mock.calls.find(call => call[0].includes('UPDATE linkedin_schedules'));
        expect(updateQueryCall).toBeDefined();
        expect(updateQueryCall[0]).toContain("SET status = $1, linkedin_post_id = $2, linkedin_post_url = $3");
        expect(updateQueryCall[1][0]).toBe('sent'); // status
        expect(updateQueryCall[1][1]).toBe('urn:li:share:12345'); // linkedin_post_id
        expect(updateQueryCall[1][2]).toBe('https://www.linkedin.com/feed/update/urn:li:share:12345/'); // linkedin_post_url
        expect(updateQueryCall[1][3]).toBe(testPost.id); // id
    });
});
