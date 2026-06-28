import fetch from 'node-fetch';

export const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Robustly parses the request body, handling both pre-parsed req.body
 * and streams, which is essential for different Vercel runtimes.
 */
export const parseBody = async (req) => {
    // If body is already parsed by a middleware or the runtime
    if (req.body && (typeof req.body === 'object' || Array.isArray(req.body))) {
        return req.body;
    }

    // If it's a string, maybe it was parsed as text but not JSON
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
        try {
            return JSON.parse(req.body);
        } catch (e) {
            // Not JSON, continue to other methods
        }
    }

    // Standard for modern fetch-based request objects (like Vercel Edge or newer Node)
    if (typeof req.json === 'function') {
        try {
            // Attempt to parse the body using the built-in .json() method.
            // Note: If the body has already been consumed, this will throw.
            return await req.json();
        } catch (e) {
            // If .json() fails (e.g., body already read or malformed), fall back to manual stream collection
        }
    }

    // Fallback: manually collect the stream for Node.js
    return new Promise((resolve) => {
        let body = '';
        const onData = (chunk) => {
            body += chunk.toString();
        };
        const onEnd = () => {
            req.removeListener('data', onData);
            req.removeListener('end', onEnd);
            req.removeListener('error', onError);
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                console.error("[parseBody] JSON Parse Error:", e.message, "Body starts with:", body.substring(0, 50));
                resolve({});
            }
        };
        const onError = (err) => {
            console.error("[parseBody] Stream Error:", err.message);
            req.removeListener('data', onData);
            req.removeListener('end', onEnd);
            req.removeListener('error', onError);
            resolve({});
        };

        if (req.on) {
            if (req.readableEnded) {
                return resolve({});
            }
            req.on('data', onData);
            req.on('end', onEnd);
            req.on('error', onError);

            // Safety timeout to prevent indefinite hangs
            setTimeout(() => {
                req.removeListener('data', onData);
                req.removeListener('end', onEnd);
                req.removeListener('error', onError);
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (e) {
                    resolve({});
                }
            }, 15000);
        } else {
            // If it doesn't have .on, and it reached here, it's not a standard stream we know how to handle.
            // Try the async iterator as a last resort if it exists.
            if (Symbol.asyncIterator in req) {
                (async () => {
                    try {
                        for await (const chunk of req) {
                            body += new TextDecoder().decode(chunk);
                        }
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) {
                        resolve({});
                    }
                })();
            } else {
                resolve({});
            }
        }
    });
};

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

  // 1. Decodificar entidades HTML (&amp; → &)
  let cleanUrl = url.replace(/&amp;/g, '&');

  // 2. Remover parâmetros de rastreamento do Google que ficam colados na URL
  // Esses parâmetros aparecem como &sa=U&ved=...&usg=... sem um ? antes
  // Ex: https://linkedin.com/posts/slug-activity-123456-XXXX&sa=U&ved=...
  // Precisamos remover tudo a partir do primeiro & que não faz parte da URL base
  const googleTrackingIndex = cleanUrl.search(/&(?:sa|ved|usg)=/);
  if (googleTrackingIndex !== -1) {
    cleanUrl = cleanUrl.substring(0, googleTrackingIndex);
  }

  // 3. Decodificar double-encoding (%25XX → %XX → char)
  try {
    // Primeiro decode: %25C3 → %C3
    cleanUrl = decodeURIComponent(cleanUrl);
  } catch (e) {
    // Se falhar, continua com a URL original limpa
  }

  // 4. Regex unificada: captura IDs de activity, ugcPost, share ou post
  // O ID vem antes do sufixo de 4 chars (ex: -dU5M) ou fim de string/parâmetro
  const unifiedRegex = /(?:activity|ugcPost|share|post)-(\d{10,})(?:-[A-Za-z0-9]{4})?|urn:li:(?:activity|ugcPost|share|post):(\d{10,})/;
  const match = cleanUrl.match(unifiedRegex);

  if (match) {
    const id = match[1] || match[2];
    let detectedType = 'ugcPost';

    if (match[1]) {
      const typeMatch = cleanUrl.match(/(activity|ugcPost|share|post)-\d{10,}/);
      detectedType = typeMatch ? typeMatch[1] : 'ugcPost';
    } else if (match[2]) {
      const urnTypeMatch = cleanUrl.match(/urn:li:(activity|ugcPost|share|post):\d{10,}/);
      detectedType = urnTypeMatch ? urnTypeMatch[1] : 'ugcPost';
    }

    return {
      urn: `urn:li:${detectedType}:${id}`,
      activityId: id,
      commentable: true
    };
  }

  // 5. Fallback para Pulse
  if (cleanUrl.includes('/pulse/')) {
    const pulseMatch = cleanUrl.match(/pulse\/.*-([0-9]+)/);
    if (pulseMatch) {
      return { urn: `urn:li:ugcPost:${pulseMatch[1]}`, activityId: pulseMatch[1], commentable: true };
    }
    return { urn: cleanUrl, commentable: false };
  }

  return null;
}
