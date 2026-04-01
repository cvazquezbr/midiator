import { describe, it, expect } from 'vitest';
import { extractLinkedinUrn } from '../api/utils.js';

describe('extractLinkedinUrn', () => {
  it('should extract activity URN from /posts/ format', () => {
    const url = 'https://www.linkedin.com/posts/fulano_titulo-activity-7234567890';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:activity:7234567890', commentable: true });
  });

  it('should extract activity URN from /feed/update/urn:li:activity: format', () => {
    const url = 'https://www.linkedin.com/feed/update/urn:li:activity:7234567890';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:activity:7234567890', commentable: true });
  });

  it('should extract ugcPost URN from /feed/update/urn:li:ugcPost: format', () => {
    const url = 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7234567890';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7234567890', commentable: true });
  });

  it('should identify Pulse articles as not commentable', () => {
    const url = 'https://www.linkedin.com/pulse/titulo-do-artigo-fulano';
    expect(extractLinkedinUrn(url)).toEqual({ urn: url, commentable: false });
  });

  it('should return null for unrecognized formats', () => {
    const url = 'https://www.google.com';
    expect(extractLinkedinUrn(url)).toBeNull();
  });

  it('should handle activity ID without full URL', () => {
     const url = 'activity-7234567890';
     expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:activity:7234567890', commentable: true });
  });
});
