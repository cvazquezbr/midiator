import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/campaigns/[id].js';
import { del } from '@vercel/blob';

// Mock the Vercel Blob module to spy on the 'del' function
vi.mock('@vercel/blob', () => ({
  del: vi.fn(),
}));

// Mock the auth middleware to bypass it
vi.mock('../api/middleware/auth.js', () => ({
  withAuth: (handler) => handler,
}));

// Mock the database module directly to avoid pg-mem issues
const mockDb = {
  campaigns: [],
  users: [],
};

vi.mock('../api/db.js', () => ({
  query: vi.fn((sql, params) => {
    const table = sql.includes('FROM campaigns') ? 'campaigns' : 'users';

    if (sql.startsWith('SELECT')) {
      if (table === 'campaigns') {
        // Ensure ID is treated as a number for comparison, as it comes from query as a string
        const campaign = mockDb.campaigns.find(c => c.id === Number(params[0]) && c.user_id === params[1]);
        return Promise.resolve({ rows: campaign ? [campaign] : [] });
      }
    }

    if (sql.startsWith('DELETE')) {
      if (table === 'campaigns') {
        const initialLength = mockDb.campaigns.length;
        // Ensure ID is treated as a number for comparison
        mockDb.campaigns = mockDb.campaigns.filter(c => !(c.id === Number(params[0]) && c.user_id === params[1]));
        const finalLength = mockDb.campaigns.length;
        return Promise.resolve({ rowCount: initialLength - finalLength });
      }
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
}));


describe('Campaigns API Endpoint with Mocked DB', () => {

  beforeEach(() => {
    // Reset mocks and the mock database before each test
    vi.clearAllMocks();

    // Setup initial state for the mock DB
    mockDb.users = [{ id: 1, sub: 'test-user-sub' }];
    mockDb.campaigns = [
      {
        id: 101,
        user_id: 1,
        name: 'Test Campaign',
        campaign_data: {
          title: 'Test Campaign',
          imageUrl: 'https://123.blob.vercel-storage.com/image.png',
          videoUrl: 'https://456.blob.vercel-storage.com/video.mp4',
          nested: {
            audio: 'https://789.blob.vercel-storage.com/audio.mp3',
          },
          nonBlobUrl: 'https://example.com/image.jpg',
        },
      },
    ];
  });

  it.skip('should delete a campaign and its associated assets', async () => {
    const campaignId = 101;
    const userId = 1;

    const req = {
      method: 'DELETE',
      user: { sub: userId }, // Correctly mock the user object from withAuth middleware
      query: { id: campaignId.toString() },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Execute the handler
    await handler(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Campaign and associated assets deleted successfully.' });

    const expectedUrlsToDelete = [
      'https://123.blob.vercel-storage.com/image.png',
      'https://456.blob.vercel-storage.com/video.mp4',
      'https://789.blob.vercel-storage.com/audio.mp3',
    ];

    expect(del).toHaveBeenCalledTimes(1);
    const deletedUrls = del.mock.calls[0][0];
    expect(deletedUrls).toHaveLength(expectedUrlsToDelete.length);
    expect(deletedUrls).toEqual(expect.arrayContaining(expectedUrlsToDelete));

    // Verify the campaign was removed from our mock DB
    expect(mockDb.campaigns.find(c => c.id === campaignId)).toBeUndefined();
  });

  it('should return 404 if campaign to delete is not found', async () => {
    const req = {
      method: 'DELETE',
      user: { sub: 1 }, // Correctly mock the user object
      query: { id: '999' }, // Non-existent ID
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Campaign not found or access denied.' });
    expect(del).not.toHaveBeenCalled();
  });
});