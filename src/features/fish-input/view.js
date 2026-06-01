import { escapeHtml, safeSpriteUrl } from '../../lib/utils.js';
import { renderDefaultObjectsCatalog } from '../default-objects/view.js';
import { t } from '../../lib/i18n.js';

// Swatch hex → locale key suffix (draw.color.*), kept beside the palette markup.
const COLOR_NAMES = {
  '#1a1a1a': 'black',
  '#ef4444': 'red',
  '#f97316': 'orange',
  '#eab308': 'yellow',
  '#22c55e': 'green',
  '#3b82f6': 'blue',
  '#a855f7': 'purple',
  '#ffffff': 'white',
};

function getStatusText(status) {
  const map = {
    idle: t('status.idle'),
    preview: t('status.preview'),
    invalid: t('status.invalid'),
  };
  return map[status] ?? map.idle;
}

function renderCreateTab(state) {
  const hasSprite = Boolean(state.spriteDataUrl);
  const statusMessage = state.message || getStatusText(state.status);
  const type = state.type === 'deco' ? 'deco' : 'fish';
  const isFish = type === 'fish';
  const nameLabel = isFish ? t('fish.name.label') : t('deco.name.label');
  const namePlaceholder = isFish ? t('fish.name.placeholder') : t('deco.name.placeholder');
  const typeBadgeIcon = isFish ? '🐟' : '🪨';
  const typeBadgeText = isFish ? t('add.fish') : t('add.deco');
  const typeHint = isFish ? t('fish.hint.swim') : t('deco.hint.stay');

  // Reflect the persisted drawing selection so the toolbar's active state
  // survives the per-stroke re-render (defaults match createFishInputState).
  const drawTool = state.drawTool ?? 'pen';
  const drawColor = state.drawColor ?? '#1a1a1a';
  const drawSize = state.drawSize ?? 8;
  const toolBtn = (tool) =>
    `class="draw-tool-btn ${drawTool === tool ? 'is-active' : ''}" data-draw-tool="${tool}" aria-pressed="${drawTool === tool}"`;
  const sizeBtn = (size, label) =>
    `class="draw-size-preset-btn ${drawSize === size ? 'is-active' : ''}" data-draw-size-preset="${size}" data-size-label="${label}" aria-pressed="${drawSize === size}" aria-label="${t(`draw.size.${label}`)}"`;
  const colorBtn = (hex, extraStyle = '') =>
    `class="draw-color-btn ${drawColor === hex ? 'is-active' : ''}" data-color="${hex}" style="--swatch-color: ${hex}${extraStyle}" aria-label="${t(`draw.color.${COLOR_NAMES[hex]}`)}" aria-pressed="${drawColor === hex}" type="button"`;

  return `
    <div class="fish-input-status" aria-live="polite">
      <p>${escapeHtml(statusMessage)}</p>
    </div>

    <div class="prop-type-segmented" role="radiogroup" aria-label="${t('prop.type.label')}" data-fish-prop-type-group>
      <button
        class="prop-type-option ${isFish ? 'is-active' : ''}"
        type="button"
        role="radio"
        aria-checked="${isFish}"
        data-fish-prop-type="fish"
      >
        <span aria-hidden="true">🐟</span>
        <span>${t('add.fish')}</span>
      </button>
      <button
        class="prop-type-option ${!isFish ? 'is-active' : ''}"
        type="button"
        role="radio"
        aria-checked="${!isFish}"
        data-fish-prop-type="deco"
      >
        <span aria-hidden="true">🪨</span>
        <span>${t('add.deco')}</span>
      </button>
    </div>
    <p class="prop-type-hint" data-fish-prop-type-hint>${escapeHtml(typeHint)}</p>

    <div class="fish-input-grid">
      <div class="input-group">
        <label class="input-label" for="fish-file">${t('img.file.label')}</label>
        <input id="fish-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" data-fish-file>
      </div>

      <div class="input-group">
        <label class="input-label" for="fish-name" data-fish-name-label>${escapeHtml(nameLabel)}</label>
        <input
          id="fish-name"
          class="text-input"
          type="text"
          value="${escapeHtml(state.name)}"
          maxlength="32"
          placeholder="${escapeHtml(namePlaceholder)}"
          data-fish-name
        >
      </div>

      ${
        isFish
          ? `
      <div class="input-group" data-fish-movement-group>
        <label class="input-label" for="fish-movement">${t('fish.movement')}</label>
        <select id="fish-movement" class="select-input" data-fish-movement>
          <option value="on" ${state.movementEnabled === false ? '' : 'selected'}>${t('fish.movement.on')}</option>
          <option value="off" ${state.movementEnabled === false ? 'selected' : ''}>${t('fish.movement.off')}</option>
        </select>
      </div>
      `
          : ''
      }

      <div class="draw-area">
        <div class="draw-toolbar">
          <div class="draw-toolbar-row draw-toolbar-row--controls">
            <div class="draw-tool-group" role="radiogroup" aria-label="${t('draw.label')}">
              <button type="button" ${toolBtn('pen')}>${t('draw.tool.pen')}</button>
              <button type="button" ${toolBtn('eraser')}>${t('draw.tool.eraser')}</button>
              <button type="button" ${toolBtn('fill')}>${t('draw.tool.fill')}</button>
            </div>
            <div class="draw-size-control">
              <div class="draw-size-presets" role="group" aria-label="${t('draw.sizeLabel')}">
                <button type="button" ${sizeBtn(8, 'thin')}></button>
                <button type="button" ${sizeBtn(14, 'medium')}></button>
                <button type="button" ${sizeBtn(22, 'thick')}></button>
              </div>
            </div>
            <div class="draw-toolbar-actions">
              <button type="button" class="button button-secondary" data-draw-undo disabled>${t('draw.undo')}</button>
              <button type="button" class="button button-secondary" data-draw-redo disabled>${t('draw.redo')}</button>
              <button type="button" class="button button-secondary" data-clear-drawing>${t('draw.clear')}</button>
            </div>
          </div>
          <div class="draw-toolbar-row draw-toolbar-row--colors">
            <div class="draw-color-row" role="group" aria-label="${t('draw.colorLabel')}">
              <button ${colorBtn('#1a1a1a')}></button>
              <button ${colorBtn('#ef4444')}></button>
              <button ${colorBtn('#f97316')}></button>
              <button ${colorBtn('#eab308')}></button>
              <button ${colorBtn('#22c55e')}></button>
              <button ${colorBtn('#3b82f6')}></button>
              <button ${colorBtn('#a855f7')}></button>
              <button ${colorBtn('#ffffff', '; border-color: #d1d5db')}></button>
            </div>
          </div>
        </div>
        <canvas
          class="fish-drawing-canvas"
          width="720"
          height="480"
          data-fish-canvas
          aria-label="${t('draw.canvas.label')}"
        ></canvas>
      </div>

      ${
        state.source === 'upload'
          ? `<div class="preview-area" data-status="${state.status}" data-prop-type="${type}">
        <span class="preview-label">${t('preview')}</span>
        <span class="preview-type-badge" data-prop-type-badge>${typeBadgeIcon} ${typeBadgeText}</span>
        ${
          hasSprite
            ? `<img class="fish-preview-image" src="${escapeHtml(safeSpriteUrl(state.spriteDataUrl))}" alt="${t('preview.alt')}">`
            : `<span class="preview-empty">${t('preview.empty')}</span>`
        }
      </div>`
          : ''
      }
    </div>
  `;
}

export function renderFishInputPanel(state) {
  if (!state.isExpanded) {
    return '';
  }

  const stage = state.sheetStage === 'full' ? 'full' : 'peek';
  const hasSprite = Boolean(state.spriteDataUrl);
  const canRegister = hasSprite && state.status !== 'invalid';
  const activeTab = state.activeTab === 'create' ? 'create' : 'catalog';
  const isCreate = activeTab === 'create';

  return `
    <div class="fish-input-backdrop" data-fish-input-backdrop aria-hidden="true"></div>
    <section
      class="fish-input-widget bottom-sheet"
      data-sheet-stage="${stage}"
      data-active-tab="${activeTab}"
      data-touch-area="child"
      aria-labelledby="fish-input-title"
      role="dialog"
      aria-modal="false"
    >
      <button
        type="button"
        class="bottom-sheet-grabber"
        data-fish-input-grabber
        aria-label="${t('sheet.expand')}"
      >
        <span class="bottom-sheet-grabber-bar" aria-hidden="true"></span>
      </button>

      <header class="bottom-sheet-header">
        <div class="prop-panel-identity">
          <span class="prop-panel-thumb-icon" aria-hidden="true">➕</span>
          <div class="prop-panel-title-group">
            <span id="fish-input-title" class="prop-panel-name">${t('add.object')}</span>
          </div>
        </div>
        <button class="prop-action-btn lang-toggle-btn" type="button" data-lang-toggle aria-label="${t('lang.toggle.label')}" title="한국어 / English">🌐</button>
        <button class="prop-action-btn" type="button" data-toggle-fish-input aria-label="${t('close')}" title="${t('close')}">×</button>
      </header>

      <div class="fish-input-tabs" role="tablist" aria-label="${t('tab.group.label')}">
        <button
          type="button"
          class="fish-input-tab ${!isCreate ? 'is-active' : ''}"
          role="tab"
          aria-selected="${!isCreate}"
          data-fish-input-tab="catalog"
        >${t('tab.catalog')}</button>
        <button
          type="button"
          class="fish-input-tab ${isCreate ? 'is-active' : ''}"
          role="tab"
          aria-selected="${isCreate}"
          data-fish-input-tab="create"
        >${t('tab.create')}</button>
      </div>

      <div class="bottom-sheet-body fish-input-panel">
        ${isCreate ? renderCreateTab(state) : renderDefaultObjectsCatalog()}
      </div>

      <footer class="bottom-sheet-footer">
        ${
          isCreate
            ? `<button
                class="button button-primary fish-input-register-btn"
                type="button"
                data-register-fish-image
                ${canRegister ? '' : 'disabled'}
              >${t('register')}</button>`
            : `<p class="fish-input-footer-hint">${t('catalog.hint')}</p>`
        }
      </footer>
    </section>
  `;
}
