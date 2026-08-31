import { describe, it, expect, vi, beforeEach } from 'vitest';
import LinkedInAPI from '../src/utils/linkedinAPI.js';

global.fetch = vi.fn();

import { uploadVideoForLinkedIn, publishToLinkedIn } from '../src/utils/linkedinAPI.js';

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

  it('should complete upload when video status becomes AVAILABLE', async () => {
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

    // 4. checkVideoStatus (first PROCESSING, then AVAILABLE)
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'PROCESSING' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'AVAILABLE' }),
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
    expect(setStatus).toHaveBeenCalledWith('Vídeo pronto para publicação!');

    vi.useRealTimers();
  });

  it('should throw error when video status remains PROCESSING after max attempts', async () => {
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

    // 4. checkVideoStatus (always PROCESSING)
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

    const expectPromise = expect(promise).rejects.toThrow(
      'O vídeo ainda está em processamento pelo LinkedIn'
    );
    await vi.runAllTimersAsync();
    await expectPromise;

    vi.useRealTimers();
  });

  it('should throw immediately when video status returns PROCESSING_FAILED', async () => {
    vi.useFakeTimers();

    const fakeBlob = new Blob(['test content'], { type: 'video/mp4' });
    fakeBlob.slice = vi.fn().mockReturnValue(fakeBlob);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ video: 'urn:li:video:789', uploadInstructions: [{ uploadUrl: 'http://upload.url', firstByte: 0, lastByte: 10 }] }),
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ eTag: 'etag-123' }),
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: 'PROCESSING_FAILED' }),
    });

    const setStatus = vi.fn();
    const promise = uploadVideoForLinkedIn(
      { accessToken: 'test_token' },
      fakeBlob,
      'urn:li:person:user',
      setStatus
    );

    const expectPromise = expect(promise).rejects.toThrow(
      'Processamento do vídeo falhou no LinkedIn (Status: PROCESSING_FAILED).'
    );
    await vi.runAllTimersAsync();
    await expectPromise;

    vi.useRealTimers();
  });

  it('should construct correct createPost payload with content.media containing id and title when publishing video', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: 'urn:li:share:999' }),
    });

    const campaignData = {
      content: 'Post text with video',
      targetId: 'user123',
      targetType: 'person',
      images: [],
      video: 'urn:li:video:789',
      title: 'Minha Campanha em Vídeo',
    };

    const res = await publishToLinkedIn(campaignData, { accessToken: 'test_token' });
    expect(res).toEqual({ id: 'urn:li:share:999' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/linkedin-proxy',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'createPost',
          accessToken: 'test_token',
          payload: {
            author: 'urn:li:person:user123',
            commentary: 'Post text with video',
            visibility: 'PUBLIC',
            distribution: {
              feedDistribution: 'MAIN_FEED',
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            lifecycleState: 'PUBLISHED',
            isReshareDisabledByAuthor: false,
            content: {
              media: {
                id: 'urn:li:video:789',
                title: 'Minha Campanha em Vídeo',
              },
            },
          },
        }),
      })
    );
  });
});
