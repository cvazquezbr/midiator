export const delay = ms => new Promise(res => setTimeout(res, ms));

export async function fetchWithRetry(url, options, retries = 5, initialBackoff = 3000) {
    let backoff = initialBackoff;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            // Retry on rate limit (429) or server errors (500+)
            if (response.status === 429 || response.status >= 500) {
                const isRateLimit = response.status === 429;
                const retryAfterHeader = response.headers.get('Retry-After');
                // Use Retry-After header if present (for 429), otherwise use exponential backoff
                const retryAfter = isRateLimit && retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : backoff;
                const jitter = Math.random() * 1000;

                const reason = isRateLimit ? "Rate limit hit" : `Server error (${response.status})`;
                console.warn(`[Retry] ${reason} on ${url}. Retrying after ${Math.round((retryAfter + jitter) / 1000)}s... (Attempt ${i + 1}/${retries})`);
                await delay(retryAfter + jitter);

                backoff *= 2;
                continue;
            }
            return response;
        } catch (error) {
            console.error(`[Retry] Network error on ${url}: ${error.message}. Attempt ${i + 1}/${retries}`);
            if (i === retries - 1) throw error;
            const jitter = Math.random() * 1000;
            await delay(backoff + jitter);
            backoff *= 2;
        }
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

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
  if (!url) return null;

  // Decodificar entidades HTML como &amp; que aparecem em resultados de busca do Google
  const decodedUrl = url.replace(/&amp;/g, '&');

  // 1. Check for Pulse
  if (decodedUrl.includes('/pulse/')) {
    // Tenta extrair o ID numérico que às vezes aparece no final de URLs de Pulse
    const pulseMatch = decodedUrl.match(/pulse\/.*-([0-9]+)/);
    if (pulseMatch) {
      return { urn: `urn:li:ugcPost:${pulseMatch[1]}`, commentable: true };
    }
    return { urn: decodedUrl, commentable: false };
  }

  // 2. Check for explicit URN in URL (feed/update/urn:li:...)
  // Aceita activity, ugcPost, share ou post e converte para ugcPost por padrão
  const urnMatch = decodedUrl.match(/urn:li:(activity|ugcPost|share|post):([0-9]+)/);
  if (urnMatch) {
    return { urn: `urn:li:ugcPost:${urnMatch[2]}`, commentable: true };
  }

  // 3. Check for activity ID in /posts/ format (e.g. activity-7234567890)
  // Comum em URLs de compartilhamento direto
  const activityMatch = decodedUrl.match(/activity-([0-9]+)/);
  if (activityMatch) {
    return { urn: `urn:li:ugcPost:${activityMatch[1]}`, commentable: true };
  }

  // 4. Fallback para IDs numéricos longos que parecem URNs no final da URL antes de parâmetros
  const genericIdMatch = decodedUrl.match(/-([0-9]{15,})/);
  if (genericIdMatch) {
     return { urn: `urn:li:ugcPost:${genericIdMatch[1]}`, commentable: true };
  }

  return null;
}
