import { escapeHtml } from '../../../lib/utils.js';

// Gray-silhouette placeholder shown while a sprite is loading or after it
// fails to load. Keeps the aquarium layout stable instead of popping in.
export function renderSpriteFallback({ width = 120, height = 120, label = '' } = {}) {
  const aria = label ? ` aria-label="${escapeHtml(label)}"` : ' aria-hidden="true"';
  return `
    <div
      class="sprite-fallback"
      style="width:${width}px;height:${height}px;"
      data-sprite-fallback
      ${aria}
    >
      <span class="sprite-fallback-bubble"></span>
    </div>
  `;
}

// Attaches load/error handling to an <img> sprite element. While the image is
// pending or has failed, the fallback element is visible; on successful load
// the fallback is hidden.
export function attachSpriteFallback(imageEl, fallbackEl) {
  if (!imageEl || !fallbackEl) return;

  const showFallback = () => {
    fallbackEl.classList.add('is-visible');
    imageEl.classList.add('is-hidden');
  };

  const hideFallback = () => {
    fallbackEl.classList.remove('is-visible');
    imageEl.classList.remove('is-hidden');
  };

  if (imageEl.complete && imageEl.naturalWidth > 0) {
    hideFallback();
  } else {
    showFallback();
  }

  imageEl.addEventListener('load', hideFallback);
  imageEl.addEventListener('error', showFallback);
}
