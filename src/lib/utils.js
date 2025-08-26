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
