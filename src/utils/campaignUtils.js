/**
 * Extracts all Vercel Blob Storage URLs from a campaign data object.
 * @param {object} data The campaign data object.
 * @returns {string[]} A list of unique asset URLs.
 */
export function extractAssetUrls(data) {
  const urls = new Set();
  const blobUrlPattern = /blob\.vercel-storage\.com/;

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string' && blobUrlPattern.test(value)) {
          urls.add(value);
        } else if (typeof value === 'object') {
          traverse(value);
        }
      }
    }
  }

  traverse(data);
  return [...urls];
}