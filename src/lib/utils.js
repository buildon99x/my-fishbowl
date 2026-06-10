export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function randomInRange(random, min, max) {
  return min + random() * (max - min);
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Validate and sanitise a sprite URL before inserting into a src attribute.
 * Allows data URLs (local canvas drawings) and same-origin/https Blob URLs.
 * Returns an empty string for anything else to prevent XSS via crafted URLs.
 */
export function safeSpriteUrl(url) {
  if (typeof url !== 'string' || url === '') return '';
  if (url.startsWith('data:image/')) return url;
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'blob:') {
      return parsed.href;
    }
  } catch {
    // malformed URL — fall through
  }
  return '';
}
