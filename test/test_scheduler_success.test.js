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

    it('should publish a scheduled post successfully (main post structure)', async () => {
        const testPost = {
            id: 101,
            user_id: 1,
            linkedin_access_token: 'test_token',
            post_content: {
                authorUrn: 'urn:li:person:test-user',
                content: {
                    fullText: 'This is the scheduled content for a main post.',
                }
            },
            campaign_data: null,
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
        };

        query.mockResolvedValueOnce({ rows: [testPost] });
        query.mockResolvedValueOnce({ rows: [] });

        fetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 'urn:li:share:12345' })),
            json: () => Promise.resolve({ id: 'urn:li:share:12345' }),
        });

        const mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(fetchBody.payload.author).toBe(testPost.post_content.authorUrn);
        expect(fetchBody.payload.commentary).toBe(testPost.post_content.content.fullText);
    });

    it('should correctly publish a follow-up post (follow-up structure)', async () => {
        const followUpPost = {
            id: 102,
            user_id: 2,
            linkedin_access_token: 'test_token_2',
            post_content: {
                authorUrn: 'urn:li:organization:test-org',
                conteudo: 'This is the content for a follow-up post.',
                // Note the different structure: no nested 'content' object
            },
            campaign_data: null,
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
        };

        query.mockResolvedValueOnce({ rows: [followUpPost] });
        query.mockResolvedValueOnce({ rows: [] });

        fetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 'urn:li:share:67890' })),
            json: () => Promise.resolve({ id: 'urn:li:share:67890' }),
        });

        const mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(fetchBody.payload.author).toBe(followUpPost.post_content.authorUrn);
        expect(fetchBody.payload.commentary).toBe(followUpPost.post_content.conteudo);
    });
});
