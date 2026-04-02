import { describe, it, expect } from 'vitest';
import { extractLinkedinUrn } from '../api/utils.js';

describe('extractLinkedinUrn', () => {
  it('should extract activity URN and convert to ugcPost from /posts/ format', () => {
    const url = 'https://www.linkedin.com/posts/fulano_titulo-activity-7443005104804270082';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });

  it('should extract activity URN and convert to ugcPost from /feed/update/urn:li:activity: format', () => {
    const url = 'https://www.linkedin.com/feed/update/urn:li:activity:7443005104804270082';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });

  it('should extract ugcPost URN from /feed/update/urn:li:ugcPost: format', () => {
    const url = 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7443005104804270082';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });

  it('should identify Pulse articles as commentable if ID is present', () => {
    const url = 'https://www.linkedin.com/pulse/titulo-do-artigo-fulano-723456789012345';
    expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:723456789012345', commentable: true });
  });

  it('should return original URL for Pulse without numeric ID', () => {
    const url = 'https://www.linkedin.com/pulse/titulo-do-artigo-fulano';
    expect(extractLinkedinUrn(url)).toEqual({ urn: url, commentable: false });
  });

  it('should return null for unrecognized formats', () => {
    const url = 'https://www.google.com';
    expect(extractLinkedinUrn(url)).toBeNull();
  });

  it('should handle activity ID and convert to ugcPost', () => {
     const url = 'activity-7443005104804270082';
     expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });

  it('should handle search result URLs with HTML entities', () => {
     const url = 'https://pt.linkedin.com/posts/xyz-activity-7443296059130515456-Uiii&amp;sa=U';
     expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443296059130515456', commentable: true });
  });

  it('should handle complex URLs from the Technical Guide', () => {
     const url = "https://www.linkedin.com/posts/marinapaoliello_treinamento-em-debate-favorece-lideran%C3%A7a-activity-7443005104804270082-aQYK/?originalSubdomain=pt";
     expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });

  it('should handle share URNs and convert to ugcPost', () => {
     const url = "urn:li:share:7443005104804270082";
     expect(extractLinkedinUrn(url)).toEqual({ urn: 'urn:li:ugcPost:7443005104804270082', commentable: true });
  });
});
