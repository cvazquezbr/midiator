export const markdownToLinkedinText = (markdown) => {
    if (!markdown) return '';
    let text = markdown;
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '$1$2');
    text = text.replace(/^#+\s/gm, '');
    text = text.replace(/^>\s/gm, '');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
    text = text.replace(/^\s*[-*]\s/gm, '');
    text = text.trim().replace(/\n{3,}/g, '\n\n');
    return text;
};

export function escapeLinkedinText(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
        try { text = String(text); } catch (e) { return ''; }
    }
    return text.replace(/([|{}@[\]()<>#*_~\\])/g, '\\$1');
}

export function extractLinkedinUrn(url) {
  // 1. Check for Pulse (not commentable via API)
  if (url.includes('/pulse/')) {
    return { urn: url, commentable: false };
  }

  // 2. Check for explicit URN in URL (feed/update/urn:li:...)
  const urnMatch = url.match(/urn:li:(activity|ugcPost):([0-9]+)/);
  if (urnMatch) {
    return { urn: urnMatch[0], commentable: true };
  }

  // 3. Check for activity ID in /posts/ format (e.g. activity-7234567890)
  const activityMatch = url.match(/activity-([0-9]+)/);
  if (activityMatch) {
    return { urn: `urn:li:activity:${activityMatch[1]}`, commentable: true };
  }

  return null;
}
