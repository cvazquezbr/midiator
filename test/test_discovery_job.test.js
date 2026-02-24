import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../api/db.js', () => ({
  query: vi.fn(),
}));

vi.mock('../api/engagement/ai-worker.js', () => ({
  processDiscoverySession: vi.fn(),
}));

import { handleRunDiscovery } from '../api/cron/discovery.js';
import { query } from '../api/db.js';
import { processDiscoverySession } from '../api/engagement/ai-worker.js';

describe('Discovery Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process pending, error, and searching sessions', async () => {
    const mockRows = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'searching' }
    ];
    query.mockResolvedValueOnce({ rows: mockRows });
    processDiscoverySession.mockResolvedValue(true);

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await handleRunDiscovery({}, mockResponse);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("status IN ('pending', 'error', 'searching')"));
    expect(processDiscoverySession).toHaveBeenCalledTimes(2);
    expect(processDiscoverySession).toHaveBeenCalledWith(1);
    expect(processDiscoverySession).toHaveBeenCalledWith(2);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Processed 2 discovery sessions.'
    }));
  });

  it('should handle no sessions to process and show total count', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // No pending/error/searching
    query.mockResolvedValueOnce({ rows: [{ count: '10' }] }); // Total count

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await handleRunDiscovery({}, mockResponse);

    expect(processDiscoverySession).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'No discovery sessions found to process.',
      debug: { totalSessions: 10 }
    });
  });

  it('should handle errors in processDiscoverySession and continue', async () => {
    const mockRows = [
      { id: 1 },
      { id: 2 }
    ];
    query.mockResolvedValueOnce({ rows: mockRows });
    processDiscoverySession
      .mockRejectedValueOnce(new Error('Failed session 1'))
      .mockResolvedValueOnce(true);

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await handleRunDiscovery({}, mockResponse);

    expect(processDiscoverySession).toHaveBeenCalledTimes(2);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      results: [
        { id: 1, status: 'error', error: 'Failed session 1' },
        { id: 2, status: 'success' }
      ]
    }));
  });
});
