const IGNORE_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'paletteId',
  'aspectRatio', 'page_id', 'campaign_id', 'original_url',
  'hex', 'rgb', 'prompt_imagem_carrossel'
]);

function isTranslatableString(key, value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (IGNORE_KEYS.has(key)) return false;
  if (value.startsWith('http') || value.startsWith('blob:') || value.startsWith('data:')) return false;
  if (value.trim().length <= 2 && !value.includes(' ')) return false;
  return true;
}

export function getTranslatableFields(data) {
  const fields = [];
  const visited = new WeakSet();

  const processedCampaign = JSON.parse(JSON.stringify(data));

  function traverse(current) {
    if (visited.has(current)) return;

    if (typeof current === 'object' && current !== null) {
      visited.add(current);

      Object.keys(current).forEach(key => {
        const value = current[key];

        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
          try {
            const parsedValue = JSON.parse(value);
            current[key] = parsedValue;
            traverse(parsedValue);
          } catch (e) {
            if (isTranslatableString(key, value)) {
              fields.push({ key, value, owner: current });
            }
          }
        } else if (isTranslatableString(key, value)) {
          fields.push({ key, value, owner: current });
        } else if (typeof value === 'object' && value !== null) {
          traverse(value);
        }
      });
    }
  }

  traverse(processedCampaign);
  return { fields, processedCampaign };
}

/**
 * Recursively extracts asset URLs from a campaign data object.
 * @param {any} data - The campaign data.
 * @returns {string[]} - A list of unique asset URLs.
 */
export function extractAssetUrls(data) {
  const urls = new Set();
  const visited = new WeakSet();

  function traverse(current) {
    if (typeof current !== 'object' || current === null || visited.has(current)) {
      return;
    }
    visited.add(current);

    Object.values(current).forEach(value => {
      if (typeof value === 'string' && (value.includes('.blob.vercel-storage.com') || value.startsWith('blob:'))) {
        urls.add(value);
      } else if (typeof value === 'object') {
        traverse(value);
      }
    });
  }

  traverse(data);
  return Array.from(urls);
}
