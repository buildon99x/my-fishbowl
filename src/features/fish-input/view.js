import { escapeHtml } from '../../lib/utils.js';
import { renderDefaultObjectsCatalog } from '../default-objects/view.js';
import { t } from '../../lib/i18n.js';

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

  return `
    <div class="fish-input-status" aria-live="polite">
      <p>${escapeHtml(statusMessage)}</p>
    </div>

    <div class="prop-type-segmented" role="radiogroup" aria-label="종류를 골라요" data-fish-prop-type-group>
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
          <div class="draw-tool-group" role="radiogroup" aria-label="${t('draw.label')}">
            <button type="button" class="draw-tool-btn is-active" data-draw-tool="pen" aria-pressed="true">${t('draw.tool.pen')}</button>
            <button type="button" class="draw-tool-btn" data-draw-tool="eraser" aria-pressed="false">${t('draw.tool.eraser')}</button>
            <button type="button" class="draw-tool-btn" data-draw-tool="fill" aria-pressed="false">${t('draw.tool.fill')}</button>
          </div>
          <div class="draw-size-control">
            <label class="draw-size-label" for="draw-size">굵기</label>
            <input
              id="draw-size"
              class="draw-size-slider"
              type="range"
              min="2"
              max="20"
              value="7"
              data-draw-size
              aria-label="펜 굵기"
            >
          </div>
          <div class="draw-toolbar-actions">
            <button type="button" class="button button-secondary" data-draw-undo disabled>${t('draw.undo')}</button>
            <button type="button" class="button button-secondary" data-clear-drawing>${t('draw.clear')}</button>
          </div>
        </div>
        <canvas
          class="fish-drawing-canvas"
          width="720"
          height="480"
          data-fish-canvas
          aria-label="오브젝트 그리기"
        ></canvas>
      </div>

      <div class="preview-area" data-status="${state.status}" data-prop-type="${type}">
        <span class="preview-label">${t('preview')}</span>
        <span class="preview-type-badge" data-prop-type-badge>${typeBadgeIcon} ${typeBadgeText}</span>
        ${
          hasSprite
            ? `<img class="fish-preview-image" src="${state.spriteDataUrl}" alt="오브젝트 미리보기">`
            : `<span class="preview-empty">${t('preview.empty')}</span>`
        }
      </div>
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
        <button class="prop-action-btn lang-toggle-btn" type="button" data-lang-toggle aria-label="언어 변경 / Change language" title="한국어 / English">🌐</button>
        <button class="prop-action-btn" type="button" data-toggle-fish-input aria-label="${t('close')}" title="${t('close')}">×</button>
      </header>

      <div class="fish-input-tabs" role="tablist" aria-label="추가 방식">
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
