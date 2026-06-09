import { escapeHtml, safeSpriteUrl } from '../../lib/utils.js';
import { t } from '../../lib/i18n.js';
import { statusFallbackKey, STAMP_SHAPES, normalizeShape } from './draw-logic.js';

// Emoji glyph per stamp shape, kept beside the picker markup (S-036).
const SHAPE_ICONS = {
  circle: '⭕',
  heart: '❤️',
  star: '⭐',
  eye: '👁️',
  drop: '💧',
  triangle: '🔺',
};

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
  return t(statusFallbackKey(status));
}

// Fish/Deco type chooser. Lives in the top bar of the full-screen window so the
// child decides "what am I making?" before drawing, without stealing canvas space.
function renderTypeSegmented(isFish) {
  return `
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
  `;
}

// Left rail: tool picker (pen/eraser/fill/stamp), the symmetry toggle, and the
// stamp-shape picker (revealed only while the stamp tool is active). Every hook
// (data-draw-tool / data-draw-symmetry / data-draw-shape*) is preserved so the
// canvas wiring and unit tests keep working unchanged.
function renderToolRail(state) {
  const drawTool = state.drawTool ?? 'pen';
  const symmetryOn = state.symmetry === true;
  const drawShape = normalizeShape(state.drawShape);
  const isStamp = drawTool === 'stamp';
  const toolBtn = (tool) =>
    `class="draw-tool-btn ${drawTool === tool ? 'is-active' : ''}" data-draw-tool="${tool}" aria-pressed="${drawTool === tool}"`;
  const shapeBtn = (shape) =>
    `class="draw-shape-btn ${drawShape === shape ? 'is-active' : ''}" data-draw-shape="${shape}" aria-pressed="${drawShape === shape}" aria-label="${t(`draw.shape.${shape}`)}" type="button"`;

  return `
    <aside class="create-rail create-rail--tools">
      <div class="create-rail-group draw-tool-group" role="radiogroup" aria-label="${t('draw.label')}">
        <button type="button" ${toolBtn('pen')}>${t('draw.tool.pen')}</button>
        <button type="button" ${toolBtn('eraser')}>${t('draw.tool.eraser')}</button>
        <button type="button" ${toolBtn('fill')}>${t('draw.tool.fill')}</button>
        <button type="button" ${toolBtn('stamp')}>${t('draw.tool.stamp')}</button>
      </div>
      <button
        type="button"
        class="draw-symmetry-btn ${symmetryOn ? 'is-active' : ''}"
        data-draw-symmetry
        aria-pressed="${symmetryOn}"
        title="${t('draw.symmetry')}"
      >${t('draw.symmetry')}</button>
      <div
        class="draw-shape-row ${isStamp ? 'is-visible' : ''}"
        data-draw-shape-row
        role="group"
        aria-label="${t('draw.shapeLabel')}"
      >
        ${STAMP_SHAPES.map((shape) => `<button ${shapeBtn(shape)}>${SHAPE_ICONS[shape]}</button>`).join('')}
      </div>
    </aside>
  `;
}

// Right rail: the color palette and the 3-step brush-size presets. Swatch and
// preset markup are unchanged (data-color / data-draw-size-preset) so persistence
// and tests hold; only the surrounding layout moved to a canvas-flanking rail.
function renderColorRail(state) {
  const drawColor = state.drawColor ?? '#1a1a1a';
  const drawSize = state.drawSize ?? 8;
  const sizeBtn = (size, label) =>
    `class="draw-size-preset-btn ${drawSize === size ? 'is-active' : ''}" data-draw-size-preset="${size}" data-size-label="${label}" aria-pressed="${drawSize === size}" aria-label="${t(`draw.size.${label}`)}"`;
  const colorBtn = (hex, extraStyle = '') =>
    `class="draw-color-btn ${drawColor === hex ? 'is-active' : ''}" data-color="${hex}" style="--swatch-color: ${hex}${extraStyle}" aria-label="${t(`draw.color.${COLOR_NAMES[hex]}`)}" aria-pressed="${drawColor === hex}" type="button"`;

  return `
    <aside class="create-rail create-rail--colors">
      <div class="create-rail-group draw-color-row" role="group" aria-label="${t('draw.colorLabel')}">
        <button ${colorBtn('#1a1a1a')}></button>
        <button ${colorBtn('#ef4444')}></button>
        <button ${colorBtn('#f97316')}></button>
        <button ${colorBtn('#eab308')}></button>
        <button ${colorBtn('#22c55e')}></button>
        <button ${colorBtn('#3b82f6')}></button>
        <button ${colorBtn('#a855f7')}></button>
        <button ${colorBtn('#ffffff', '; border-color: #d1d5db')}></button>
      </div>
      <div class="create-rail-group draw-size-control">
        <div class="draw-size-presets" role="group" aria-label="${t('draw.sizeLabel')}">
          <button type="button" ${sizeBtn(8, 'thin')}></button>
          <button type="button" ${sizeBtn(14, 'medium')}></button>
          <button type="button" ${sizeBtn(22, 'thick')}></button>
        </div>
      </div>
    </aside>
  `;
}

// Center stage: the live drawing canvas (the star of the window), its symmetry
// guide overlay, a one-time coach-mark for first-time users, and — only in the
// upload flow — the separate image preview.
function renderCanvasStage(state) {
  const symmetryOn = state.symmetry === true;
  const hasSprite = Boolean(state.spriteDataUrl);
  const type = state.type === 'deco' ? 'deco' : 'fish';
  const isFish = type === 'fish';
  const typeBadgeIcon = isFish ? '🐟' : '🪨';
  const typeBadgeText = isFish ? t('add.fish') : t('add.deco');
  const showCoach = state.coachmarkSeen !== true && !hasSprite;

  const previewBlock =
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
      : '';

  return `
    <div class="create-canvas-stage">
      <div class="draw-canvas-wrap">
        <canvas
          class="fish-drawing-canvas"
          width="720"
          height="480"
          data-fish-canvas
          aria-label="${t('draw.canvas.label')}"
        ></canvas>
        <div
          class="draw-symmetry-guide ${symmetryOn ? 'is-visible' : ''}"
          data-draw-symmetry-guide
          aria-hidden="true"
        ></div>
        ${
          showCoach
            ? `<div class="create-coachmark" data-create-coachmark role="note">
                <span class="create-coachmark-emoji" aria-hidden="true">👆</span>
                <span>${escapeHtml(t('create.coach.hint'))}</span>
              </div>`
            : ''
        }
      </div>
      ${previewBlock}
    </div>
  `;
}

// Footer: history actions (undo/redo/clear), the lightweight metadata controls
// (name, movement for fish, optional image upload), and the primary Add button.
function renderFooter(state, canRegister) {
  const type = state.type === 'deco' ? 'deco' : 'fish';
  const isFish = type === 'fish';
  const nameLabel = isFish ? t('fish.name.label') : t('deco.name.label');
  const namePlaceholder = isFish ? t('fish.name.placeholder') : t('deco.name.placeholder');

  return `
    <footer class="create-window-footer">
      <div class="create-window-history draw-toolbar-actions" role="group" aria-label="${t('draw.label')}">
        <button type="button" class="button button-secondary" data-draw-undo disabled>${t('draw.undo')}</button>
        <button type="button" class="button button-secondary" data-draw-redo disabled>${t('draw.redo')}</button>
        <button type="button" class="button button-secondary" data-clear-drawing>${t('draw.clear')}</button>
      </div>

      <div class="create-window-meta">
        <div class="input-group input-group--name">
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
            ? `<div class="input-group input-group--movement" data-fish-movement-group>
                <label class="input-label" for="fish-movement">${t('fish.movement')}</label>
                <select id="fish-movement" class="select-input" data-fish-movement>
                  <option value="on" ${state.movementEnabled === false ? '' : 'selected'}>${t('fish.movement.on')}</option>
                  <option value="off" ${state.movementEnabled === false ? 'selected' : ''}>${t('fish.movement.off')}</option>
                </select>
              </div>`
            : ''
        }
        <div class="input-group input-group--file">
          <label class="input-label" for="fish-file">${t('img.file.label')}</label>
          <input id="fish-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" data-fish-file>
        </div>
      </div>

      <button
        class="button button-primary fish-input-register-btn"
        type="button"
        data-register-fish-image
        ${canRegister ? '' : 'disabled'}
      >${t('register')}</button>
    </footer>
  `;
}

export function renderFishInputPanel(state) {
  if (!state.isExpanded) {
    return '';
  }

  const statusMessage = state.message || getStatusText(state.status);
  const isFish = (state.type === 'deco' ? 'deco' : 'fish') === 'fish';
  const typeHint = isFish ? t('fish.hint.swim') : t('deco.hint.stay');
  const hasSprite = Boolean(state.spriteDataUrl);
  const canRegister = hasSprite && state.status !== 'invalid';

  return `
    <section
      class="fish-input-widget create-window"
      data-touch-area="child"
      data-create-window
      aria-labelledby="fish-input-title"
      role="dialog"
      aria-modal="true"
    >
      <header class="create-window-topbar">
        <div class="create-window-identity">
          <span class="create-window-icon" aria-hidden="true">✏️</span>
          <span id="fish-input-title" class="create-window-title">${t('create.title')}</span>
        </div>

        <div class="create-window-type">
          ${renderTypeSegmented(isFish)}
          <p class="prop-type-hint" data-fish-prop-type-hint>${escapeHtml(typeHint)}</p>
        </div>

        <div class="create-window-topbar-actions">
          <button class="prop-action-btn lang-toggle-btn" type="button" data-lang-toggle aria-label="${t('lang.toggle.label')}" title="한국어 / English">🌐</button>
          <button class="prop-action-btn" type="button" data-toggle-fish-input aria-label="${t('close')}" title="${t('close')}">×</button>
        </div>
      </header>

      <div class="fish-input-status" aria-live="polite">
        <p>${escapeHtml(statusMessage)}</p>
      </div>

      <div class="create-window-stage">
        ${renderToolRail(state)}
        ${renderCanvasStage(state)}
        ${renderColorRail(state)}
      </div>

      ${renderFooter(state, canRegister)}
    </section>
  `;
}
