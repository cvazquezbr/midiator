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
  return html.replace(/<[^>]*>?/gm, '');
}
