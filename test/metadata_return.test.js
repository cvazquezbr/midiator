import { vi, describe, it, expect, beforeEach } from 'vitest';
import postHandler from '../api/campaigns/index.js';
import putHandler from '../api/campaigns/[id].js';

// Mock the auth middleware to bypass it
vi.mock('../api/middleware/auth.js', () => ({
  withAuth: (handler) => handler,
}));

// Mock the database module
const mockQuery = vi.fn();
vi.mock('../api/db.js', () => ({
  query: (sql, params) => mockQuery(sql, params),
}));

describe('Campaigns API Metadata Return', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/campaigns should return metadata fields', async () => {
    const userId = 'user-123';
    const campaignData = { name: 'New Campaign', campaign_data: {}, autor_id: 'autor-1', persona_id: 'persona-1', palette_id: 'palette-1' };

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        name: 'New Campaign',
        updated_at: '2023-01-01',
        autor_id: 'autor-1',
        persona_id: 'persona-1',
        palette_id: 'palette-1'
      }]
    });

    const req = {
      method: 'POST',
      user: { sub: userId },
      [Symbol.asyncIterator]: async function* () {
        yield new TextEncoder().encode(JSON.stringify(campaignData));
      }
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await postHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('autor_id', 'autor-1');
    expect(responseData).toHaveProperty('persona_id', 'persona-1');
    expect(responseData).toHaveProperty('palette_id', 'palette-1');

    // Verify SQL contains the new RETURNING fields
    const lastQuery = mockQuery.mock.calls[0][0];
    expect(lastQuery).toContain('RETURNING id, name, updated_at, autor_id, persona_id, palette_id');
  });

  it('PUT /api/campaigns/[id] should return metadata fields', async () => {
    const userId = 'user-123';
    const campaignId = '101';
    const campaignData = { name: 'Updated Campaign', campaign_data: {}, autor_id: 'autor-2', persona_id: 'persona-2', palette_id: 'palette-2' };

    // First query is the access check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 101 }] });
    // Second query is the update
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 101,
        name: 'Updated Campaign',
        updated_at: '2023-01-02',
        autor_id: 'autor-2',
        persona_id: 'persona-2',
        palette_id: 'palette-2'
      }]
    });

    const req = {
      method: 'PUT',
      user: { sub: userId, email: 'test@example.com' },
      query: { id: campaignId },
      [Symbol.asyncIterator]: async function* () {
        yield new TextEncoder().encode(JSON.stringify(campaignData));
      }
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await putHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('autor_id', 'autor-2');
    expect(responseData).toHaveProperty('persona_id', 'persona-2');
    expect(responseData).toHaveProperty('palette_id', 'palette-2');

    // Verify SQL contains the new RETURNING fields
    const updateQuery = mockQuery.mock.calls[1][0];
    expect(updateQuery).toContain('RETURNING id, name, updated_at, autor_id, persona_id, palette_id');
  });
});
