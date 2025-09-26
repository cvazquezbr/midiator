import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Remove HTML tags from a string.
 * @param {string} html The input string with HTML.
 * @returns {string} The string with HTML tags removed.
 */
export function stripHtml(html) {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    console.error("Error stripping HTML, falling back to regex", e);
    // Fallback for environments where DOMParser might not be available or fails
    return html.replace(/<[^>]*>?/gm, '');
  }
}

// Campos que devem usar renderização HTML
const htmlFields = ['mensagem', 'texto principal', 'descrição', 'conteúdo', 'texto'];

export const isHtmlField = (fieldName) => {
  if (!fieldName) return false;
  return htmlFields.some(field =>
    fieldName.toLowerCase().includes(field.toLowerCase())
  );
};

/**
 * Clones an object deeply, but avoids breaking blob URLs.
 * If an object appears to be an image element with a blob URL,
 * it is shallow-copied to preserve the URL reference.
 * @param {*} obj The object to clone.
 * @returns {*} The cloned object.
 */
export const safeDeepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // If the object looks like an image element with a blob URL, shallow-clone it.
  // This prevents the blob URL from being lost during JSON serialization/deserialization.
  if (typeof obj.src === 'string' && obj.src.startsWith('blob:')) {
    return { ...obj };
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    const arrCopy = [];
    for (let i = 0; i < obj.length; i++) {
      arrCopy[i] = safeDeepClone(obj[i]);
    }
    return arrCopy;
  }

  const objCopy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      objCopy[key] = safeDeepClone(obj[key]);
    }
  }
  return objCopy;
};

export const markdownToLinkedinText = (markdown) => {
    if (!markdown) return '';

    // First, strip any HTML tags that might be present
    let text = stripHtml(markdown);

    // Collapse multiple newlines to just two for cleaner formatting
    text = text.trim().replace(/\n{3,}/g, '\n\n');

    return text;
};
