import { DEFAULT_FISH_NAME } from './state.js';

const STATUS_TEXT = {
  idle: 'Choose an image or draw a fish.',
  preview: 'Fish image preview is ready.',
  invalid: 'This file type cannot be registered.',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderFishInputPanel(state) {
  const hasSprite = Boolean(state.spriteDataUrl);
  const canRegister = hasSprite && state.status !== 'invalid';
  const statusMessage = state.message || STATUS_TEXT[state.status] || STATUS_TEXT.idle;
  const summary = state.name.trim() || (hasSprite ? DEFAULT_FISH_NAME : 'No fish image selected');
  const bodyId = 'fish-input-widget-body';

  return `
    <section class="fish-input-widget" aria-labelledby="fish-input-title" data-expanded="${state.isExpanded}">
      <button
        class="fish-input-toggle"
        type="button"
        aria-expanded="${state.isExpanded}"
        aria-controls="${bodyId}"
        data-toggle-fish-input
      >
        <span class="fish-input-toggle-copy">
          <span id="fish-input-title">Add fish image</span>
          <span>${escapeHtml(summary)}</span>
        </span>
        <span class="fish-input-toggle-icon" aria-hidden="true">${state.isExpanded ? 'Close' : 'Open'}</span>
      </button>

      <div class="fish-input-panel" id="${bodyId}" ${state.isExpanded ? '' : 'hidden'}>
        <div class="fish-input-header">
          <p>${escapeHtml(statusMessage)}</p>
        </div>

        <div class="fish-input-grid">
          <div class="input-group">
            <label class="input-label" for="fish-file">Image file</label>
            <input id="fish-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" data-fish-file>
          </div>

          <div class="input-group">
            <label class="input-label" for="fish-name">Fish name</label>
            <input
              id="fish-name"
              class="text-input"
              type="text"
              value="${escapeHtml(state.name)}"
              maxlength="32"
              placeholder="Mango"
              data-fish-name
            >
          </div>

          <div class="input-group">
            <label class="input-label" for="fish-movement">Movement</label>
            <select id="fish-movement" class="select-input" data-fish-movement>
              <option value="on" ${state.movementEnabled === false ? '' : 'selected'}>On</option>
              <option value="off" ${state.movementEnabled === false ? 'selected' : ''}>Off</option>
            </select>
          </div>

          <div class="draw-area">
            <div class="draw-toolbar">
              <span>Draw</span>
              <button class="button button-secondary" type="button" data-clear-drawing>Clear</button>
            </div>
            <canvas class="fish-drawing-canvas" width="240" height="160" data-fish-canvas aria-label="Draw fish image"></canvas>
          </div>

          <div class="preview-area" data-status="${state.status}">
            <span class="preview-label">Preview</span>
            ${
              hasSprite
                ? `<img class="fish-preview-image" src="${state.spriteDataUrl}" alt="Fish image preview">`
                : '<span class="preview-empty">No image yet</span>'
            }
          </div>
        </div>

        <button class="button button-primary" type="button" data-register-fish-image ${canRegister ? '' : 'disabled'}>
          Register image
        </button>
      </div>
    </section>
  `;
}
