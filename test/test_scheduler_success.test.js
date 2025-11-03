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

        const mockHeaders = new Map();
        mockHeaders.set('x-restli-id', 'urn:li:share:12345');
        fetch.mockResolvedValue({
            ok: true,
            status: 201,
            headers: mockHeaders,
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

        const updateQueryCall = query.mock.calls.find(call => call[0].includes('UPDATE linkedin_schedules'));
        expect(updateQueryCall).toBeDefined();
        expect(updateQueryCall[1][1]).toBe('urn:li:share:12345'); // linkedin_post_id
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

        const mockHeaders = new Map();
        mockHeaders.set('x-restli-id', 'urn:li:share:67890');
        fetch.mockResolvedValue({
            ok: true,
            status: 201,
            headers: mockHeaders,
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

        const updateQueryCall = query.mock.calls.find(call => call[0].includes('UPDATE linkedin_schedules'));
        expect(updateQueryCall).toBeDefined();
        expect(updateQueryCall[1][1]).toBe('urn:li:share:67890'); // linkedin_post_id
    });

    it('should handle a scheduled post with an image', async () => {
        const imagePost = {
            id: 103,
            user_id: 3,
            linkedin_access_token: 'test_token_3',
            post_content: {
                authorUrn: 'urn:li:person:test-user-3',
                content: {
                    fullText: 'Check out this cool image!',
                    images: ['http://example.com/image.jpg'],
                }
            },
            campaign_data: null,
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
        };

        query.mockResolvedValueOnce({ rows: [imagePost] });
        query.mockResolvedValueOnce({ rows: [] });

        // Mock fetch for image download, then for image upload, then for post creation
        fetch
            .mockResolvedValueOnce({ // Image download
                ok: true,
                headers: { get: () => 'image/jpeg' },
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            })
            .mockResolvedValueOnce({ // Image upload via proxy
                ok: true,
                text: () => Promise.resolve(JSON.stringify({ assetUrn: 'urn:li:image:uploaded-asset' })),
                json: () => Promise.resolve({ assetUrn: 'urn:li:image:uploaded-asset' }),
            })
            .mockResolvedValueOnce({ // Post creation
                ok: true,
                status: 201,
                headers: new Map([['x-restli-id', 'urn:li:share:image-post']]),
                text: () => Promise.resolve(JSON.stringify({ id: 'urn:li:share:image-post' })),
                json: () => Promise.resolve({ id: 'urn:li:share:image-post' }),
            });

        const mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        // Verify the final fetch call to create the post
        const createPostFetchCall = fetch.mock.calls.find(call => call[0].endsWith('/api/linkedin-proxy') && JSON.parse(call[1].body).action === 'createPost');
        const fetchBody = JSON.parse(createPostFetchCall[1].body);

        expect(fetchBody.payload.content.media.id).toBe('urn:li:image:uploaded-asset');
    });
});
