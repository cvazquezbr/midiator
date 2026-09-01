import { handleRunScheduler } from '../api/cron/linkedin.js';
import { query } from '../api/db.js';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../api/db.js', () => ({
    query: vi.fn(),
}));

vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));

import fetch from 'node-fetch';

// Helper to create a mock response object for the scheduler handler
const createMockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scheduler Success Test', () => {
    beforeEach(() => {
        // Reset all mocks before each test to ensure isolation
        vi.resetAllMocks();
    });

    it('should publish a scheduled post successfully (main post structure)', async () => {
        const testPost = {
            id: 101,
            user_id: 1,
            linkedin_access_token: 'test_token',
            post_content: {
                authorUrn: 'urn:li:person:test-user',
                content: { fullText: 'This is the scheduled content for a main post.' }
            },
        };

        query
            .mockResolvedValueOnce({ rows: [testPost] }) // Get first batch
            .mockResolvedValueOnce({ rowCount: 1 })      // DB update status
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Engagement session creation
            .mockResolvedValueOnce({ rows: [] });        // Get second batch (empty)

        const responsePayload = { id: 'urn:li:share:12345' };
        const mockHeaders = new Map([['x-restli-id', 'urn:li:share:12345']]);
        fetch.mockResolvedValue({
            ok: true,
            status: 201,
            headers: mockHeaders,
            json: () => Promise.resolve(responsePayload),
            text: () => Promise.resolve(JSON.stringify(responsePayload)),
        });

        const mockResponse = createMockResponse();
        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const createPostCall = fetch.mock.calls.find(c => c[1] && c[1].body && JSON.parse(c[1].body).action === 'createPost');
        expect(createPostCall).toBeDefined();

        const updateQuery = query.mock.calls.find(c => c[0].startsWith('UPDATE'));
        expect(updateQuery).toBeDefined();
        expect(updateQuery[1]).toContain('urn:li:share:12345');
    });

    it('should correctly publish a follow-up post (follow-up structure)', async () => {
        const parentPostInDb = {
            linkedin_post_url: 'https://www.linkedin.com/feed/update/urn:li:share:parent123/',
            post_content: JSON.stringify({
                cta: 'Check out the main post!',
                hashtags: ['#testing', '#followup']
            })
        };

        const followUpPost = {
            id: 102,
            parent_id: 100, // Make this a follow-up post
            user_id: 2,
            parent_id: 100,
            linkedin_access_token: 'test_token_2',
            post_content: {
                authorUrn: 'urn:li:organization:test-org',
                conteudo: 'This is the content for a follow-up post.',
            },
        };

        // Mock DB calls in order: get post, get parent, update post, create session
        query.mockResolvedValueOnce({ rows: [followUpPost] });
        query.mockResolvedValueOnce({ rows: [parentPostInDb] });
        query.mockResolvedValueOnce({ rowCount: 1 }); // Update schedule
        query.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Create session
        query.mockResolvedValueOnce({ rows: [] }); // Final check

        const responsePayload = { id: 'urn:li:share:67890' };
        const mockHeaders = new Map([['x-restli-id', 'urn:li:share:67890']]);
        fetch.mockResolvedValue({
            ok: true,
            status: 201,
            headers: mockHeaders,
            json: () => Promise.resolve(responsePayload),
            text: () => Promise.resolve(JSON.stringify(responsePayload)),
        });

        const mockResponse = createMockResponse();
        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(fetchBody.payload.author).toBe(followUpPost.post_content.authorUrn);

        // Assert that the commentary is correctly constructed
        const expectedCommentary = [
            'This is the content for a follow-up post.',
            '----',
            'Check out the main post!',
            '----',
            '#testing #followup',
            '\nPost original: https://www.linkedin.com/feed/update/urn:li:share:parent123/'
        ].join('\n').trim();
        expect(fetchBody.payload.commentary).toBe(expectedCommentary);


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
                content: { fullText: 'Check out this cool image!', images: ['http://example.com/image.jpg'] }
            },
        };

        query
            .mockResolvedValueOnce({ rows: [imagePost] })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ id: 3 }] })
            .mockResolvedValueOnce({ rows: [] });

        const createPostPayload = { id: 'urn:li:share:image-post' };
        fetch
            .mockResolvedValueOnce({ // Image download
                ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            })
            .mockResolvedValueOnce({ // Proxy: uploadAndCheckImage
                ok: true, json: () => Promise.resolve({ assetUrn: 'urn:li:image:uploaded-asset' }), text: () => Promise.resolve(JSON.stringify({ assetUrn: 'urn:li:image:uploaded-asset' }))
            })
            .mockResolvedValueOnce({ // Proxy: createPost
                ok: true, status: 201, headers: new Map([['x-restli-id', 'urn:li:share:image-post']]), json: () => Promise.resolve(createPostPayload), text: () => Promise.resolve(JSON.stringify(createPostPayload))
            });

        const mockResponse = createMockResponse();
        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const createPostCall = fetch.mock.calls.find(c => c[1] && c[1].body && JSON.parse(c[1].body).action === 'createPost');
        expect(createPostCall).toBeDefined();
        const body = JSON.parse(createPostCall[1].body);
        expect(body.payload.content.media.id).toBe('urn:li:image:uploaded-asset');

        const updateQuery = query.mock.calls.find(c => c[0].startsWith('UPDATE'));
        expect(updateQuery).toBeDefined();
        expect(updateQuery[1]).toContain('urn:li:share:image-post');
    }, 10000);

    it('should inherit parent post video for follow-up post if no video is specified on follow-up', async () => {
        const mainPost = {
            id: 105,
            user_id: 2,
            linkedin_access_token: 'test_token_5',
            post_content: {
                authorUrn: 'urn:li:organization:test-org',
                content: { fullText: 'Main post text.' },
                videoUrl: 'http://example.com/video.mp4'
            }
        };

        const followUpPost = {
            id: 106,
            parent_id: 105,
            user_id: 2,
            linkedin_access_token: 'test_token_5',
            post_content: {
                authorUrn: 'urn:li:organization:test-org',
                conteudo: 'Follow-up post inheriting video.',
            },
        };

        // Query mock: First run returns mainPost and followUpPost together
        query
            .mockResolvedValueOnce({ rows: [mainPost, followUpPost] })
            .mockResolvedValueOnce({ rowCount: 1 }) // update main post
            .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // session main post
            .mockResolvedValueOnce({ rowCount: 1 }) // update follow-up post
            .mockResolvedValueOnce({ rows: [{ id: 6 }] }) // session follow-up post
            .mockResolvedValueOnce({ rows: [] });

        const initUploadPayload = { value: { video: 'urn:li:video:main-video-urn', uploadInstructions: [{ uploadUrl: 'http://upload.linkedin.com/part1', firstByte: 0, lastByte: 7 }] } };
        const createMainPayload = { id: 'urn:li:share:main-video-post' };
        const createFollowupPayload = { id: 'urn:li:share:followup-video-post' };

        fetch
            .mockResolvedValueOnce({ // Download video
                ok: true, headers: new Map([['content-type', 'video/mp4']]), arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            })
            .mockResolvedValueOnce({ // Proxy initializeVideoUpload
                ok: true, status: 200, json: () => Promise.resolve(initUploadPayload), text: () => Promise.resolve(JSON.stringify(initUploadPayload))
            })
            .mockResolvedValueOnce({ // Direct PUT to uploadUrl
                ok: true, status: 200, headers: new Map([['ETag', '"tag123"']])
            })
            .mockResolvedValueOnce({ // Proxy finalizeVideoUpload
                ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true }))
            })
            .mockResolvedValueOnce({ // Proxy checkVideoStatus
                ok: true, status: 200, json: () => Promise.resolve({ status: 'AVAILABLE' }), text: () => Promise.resolve(JSON.stringify({ status: 'AVAILABLE' }))
            })
            .mockResolvedValueOnce({ // Proxy createPost (Main)
                ok: true, status: 201, headers: new Map([['x-restli-id', 'urn:li:share:main-video-post']]), json: () => Promise.resolve(createMainPayload), text: () => Promise.resolve(JSON.stringify(createMainPayload))
            })
            .mockResolvedValueOnce({ // Proxy createPost (Follow-up)
                ok: true, status: 201, headers: new Map([['x-restli-id', 'urn:li:share:followup-video-post']]), json: () => Promise.resolve(createFollowupPayload), text: () => Promise.resolve(JSON.stringify(createFollowupPayload))
            });

        const mockResponse = createMockResponse();
        await handleRunScheduler(mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);

        const createPostCalls = fetch.mock.calls.filter(c => {
            if (!c[1] || typeof c[1].body !== 'string') return false;
            try { return JSON.parse(c[1].body).action === 'createPost'; } catch (e) { return false; }
        });
        expect(createPostCalls.length).toBe(2);

        const followupPostCall = createPostCalls[1];
        const body = JSON.parse(followupPostCall[1].body);
        expect(body.payload.content.media.id).toBe('urn:li:video:main-video-urn');
    }, 15000);
});
