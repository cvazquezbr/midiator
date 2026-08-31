import { describe, it, expect, vi, beforeEach } from 'vitest';
import LinkedInAPI from '../src/utils/linkedinAPI.js';

global.fetch = vi.fn();

import { uploadVideoForLinkedIn } from '../src/utils/linkedinAPI.js';

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

  it('should proceed with publishing when video status is PROCESSING', async () => {
    vi.useFakeTimers();

    const fakeBlob = new Blob(['test content'], { type: 'video/mp4' });
    fakeBlob.slice = vi.fn().mockReturnValue(fakeBlob);

    // 1. initializeVideoUpload
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ video: 'urn:li:video:789', uploadInstructions: [{ uploadUrl: 'http://upload.url', firstByte: 0, lastByte: 10 }] }),
    });

    // 2. proxy upload chunk
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ eTag: 'etag-123' }),
    });

    // 3. finalizeVideoUpload
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    });

    // 4. checkVideoStatus (returns PROCESSING)
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: 'PROCESSING' }),
    });

    const setStatus = vi.fn();
    const promise = uploadVideoForLinkedIn(
      { accessToken: 'test_token' },
      fakeBlob,
      'urn:li:person:user',
      setStatus
    );

    await vi.runAllTimersAsync();
    const videoUrn = await promise;

    expect(videoUrn).toBe('urn:li:video:789');
    expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('Vídeo em processamento pelo LinkedIn (PROCESSING)'));

    vi.useRealTimers();
  });
});
