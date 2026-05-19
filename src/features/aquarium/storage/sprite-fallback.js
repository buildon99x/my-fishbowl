/**
 * sprite-fallback.js — child-zone sprite loading fallback.
 *
 * When a fish sprite image takes more than 200 ms to load (or fails), shows
 * a grey silhouette + a bubble placeholder in the same position.
 * On successful load the fallback is removed naturally.
 *
 * Respects `prefers-reduced-motion`: when reduced motion is requested the
 * bubble burst animation is replaced with a simple static silhouette.
 *
 * Usage:
 *   showSpriteFallback(fishEl)
 *   hideSpriteFallback(fishEl)
 */

const FALLBACK_DELAY_MS = 200;
const FALLBACK_ATTR = 'data-sprite-fallback';
const TIMER_ATTR = '__spriteFallbackTimer';

/**
 * Returns true when the user has requested reduced motion.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Creates the fallback DOM element that visually replaces the sprite while it
 * loads.  The element is positioned to overlay the fish sprite.
 *
 * @returns {HTMLElement}
 */
function createFallbackEl() {
  const el = document.createElement('span');
  el.setAttribute(FALLBACK_ATTR, 'true');
  el.setAttribute('aria-hidden', 'true');

  const reduced = prefersReducedMotion();

  // Base styles — grey silhouette shape centred over the fish position.
  // The element relies on the parent (.fish-sprite) being position:relative
  // or position:absolute (which it already is via CSS vars).
  Object.assign(el.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: '1',
  });

  // Grey silhouette fish shape (simple oval as a placeholder).
  const silhouette = document.createElement('span');
  Object.assign(silhouette.style, {
    display: 'block',
    width: '60%',
    height: '40%',
    borderRadius: '50%',
    background: '#b0b8c1',
    opacity: '0.7',
  });

  el.appendChild(silhouette);

  if (!reduced) {
    // Bubble burst placeholder — one small bubble element with CSS animation.
    const bubble = document.createElement('span');
    Object.assign(bubble.style, {
      position: 'absolute',
      bottom: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      border: '1.5px solid #90a4ae',
      opacity: '0',
      animation: 'spriteFallbackBubble 0.8s ease-out forwards',
    });
    el.appendChild(bubble);

    // Inject keyframes once per document.
    if (!document.getElementById('sprite-fallback-style')) {
      const style = document.createElement('style');
      style.id = 'sprite-fallback-style';
      style.textContent = `
        @keyframes spriteFallbackBubble {
          0%   { opacity: 0.7; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0;   transform: translateX(-50%) translateY(-12px); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  return el;
}

/**
 * Shows a grey silhouette + bubble placeholder over `fishEl` if its sprite
 * takes longer than 200 ms to load.
 *
 * If the image is already loaded or if a fallback is already attached, this
 * is a no-op.
 *
 * @param {HTMLImageElement} fishEl - The fish sprite `<img>` element
 */
export function showSpriteFallback(fishEl) {
  if (!fishEl) return;

  // Already loaded — nothing to do.
  if (fishEl.complete && fishEl.naturalWidth > 0) return;

  // Already showing a fallback.
  if (fishEl[TIMER_ATTR] !== undefined) return;

  fishEl[TIMER_ATTR] = setTimeout(() => {
    // Only show if still loading.
    if (fishEl.complete && fishEl.naturalWidth > 0) {
      delete fishEl[TIMER_ATTR];
      return;
    }

    // Ensure the parent container can host the absolute-positioned overlay.
    const parent = fishEl.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    const fallback = createFallbackEl();
    fishEl.insertAdjacentElement('afterend', fallback);
    fishEl.dataset.hasFallback = 'true';
    delete fishEl[TIMER_ATTR];
  }, FALLBACK_DELAY_MS);
}

/**
 * Removes the fallback overlay from `fishEl` (if present) and cancels any
 * pending show timer.
 *
 * @param {HTMLImageElement} fishEl - The fish sprite `<img>` element
 */
export function hideSpriteFallback(fishEl) {
  if (!fishEl) return;

  // Cancel a pending timer.
  if (fishEl[TIMER_ATTR] !== undefined) {
    clearTimeout(fishEl[TIMER_ATTR]);
    delete fishEl[TIMER_ATTR];
  }

  // Remove any rendered fallback element.
  const parent = fishEl.parentElement;
  if (parent) {
    const existing = parent.querySelector(`[${FALLBACK_ATTR}]`);
    if (existing) existing.remove();
  }

  delete fishEl.dataset.hasFallback;
}
