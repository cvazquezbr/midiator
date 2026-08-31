import { describe, it, expect, vi, beforeEach } from 'vitest';
import LinkedInAPI from '../src/utils/linkedinAPI.js';

global.fetch = vi.fn();

describe('LinkedInAPI Video & Response Parsing Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should parse non-empty JSON response correctly in _proxyFetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ video: 'urn:li:video:123' }),
    });

    const api = new LinkedInAPI('test_token');
    const res = await api._proxyFetch('checkVideoStatus', { videoUrn: 'urn:li:video:123' });
    expect(res).toEqual({ video: 'urn:li:video:123' });
  });

  it('should handle empty response body gracefully in _proxyFetch without throwing JSON parse error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const api = new LinkedInAPI('test_token');
    const res = await api._proxyFetch('finalizeVideoUpload', {});
    expect(res).toEqual({});
  });

  it('should throw proper error message when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ error: 'Invalid video URN' }),
    });

    const api = new LinkedInAPI('test_token');
    await expect(api._proxyFetch('checkVideoStatus', { videoUrn: 'invalid' }))
      .rejects.toThrow("LinkedIn Proxy Error for action 'checkVideoStatus': Invalid video URN");
  });
});
