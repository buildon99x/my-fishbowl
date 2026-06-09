import { escapeHtml } from '../../lib/utils.js';
import { t } from '../../lib/i18n.js';
import { DEFAULT_OBJECTS_MANIFEST } from '../../assets/default-objects/manifest.js';

function renderCard(entry) {
  const isFish = entry.type === 'fish';
  const typeIcon = isFish ? '🐟' : '🪨';
  const typeText = isFish ? t('add.fish') : t('add.deco');
  return `
    <button
      type="button"
      class="default-objects-card default-objects-card--${entry.type}"
      data-default-object-id="${escapeHtml(entry.id)}"
      aria-label="${escapeHtml(entry.name)} (${typeText})"
    >
      <span class="default-objects-card-thumb">
        <img src="${entry.spriteUrl}" alt="" loading="lazy">
      </span>
      <span class="default-objects-card-name">${escapeHtml(entry.name)}</span>
      <span class="default-objects-card-badge default-objects-card-badge--${entry.type}" aria-hidden="true">
        ${typeIcon} <span class="default-objects-card-badge-text">${typeText}</span>
      </span>
    </button>
  `;
}

function renderGroup(type, entries) {
  if (entries.length === 0) return '';
  const isFish = type === 'fish';
  const icon = isFish ? '🐟' : '🪨';
  const label = isFish ? t('add.fish') : t('add.deco');
  return `
    <section class="default-objects-group default-objects-group--${type}" aria-label="${label}">
      <header class="default-objects-group-header">
        <span class="default-objects-group-emoji" aria-hidden="true">${icon}</span>
        <span class="default-objects-group-label">${label}</span>
      </header>
      <div class="default-objects-grid">
        ${entries.map(renderCard).join('')}
      </div>
    </section>
  `;
}

function renderDefaultObjectsCatalog() {
  const fish = DEFAULT_OBJECTS_MANIFEST.filter((e) => e.type === 'fish');
  const deco = DEFAULT_OBJECTS_MANIFEST.filter((e) => e.type === 'deco');
  const empty = DEFAULT_OBJECTS_MANIFEST.length === 0;

  return `
    <div class="default-objects-modal-body" data-default-objects-modal>
      ${empty ? `
        <div class="default-objects-empty">
          <span class="default-objects-empty-emoji" aria-hidden="true">❓</span>
          <p>기본 오브젝트가 비어 있어요.</p>
        </div>
      ` : `
        ${renderGroup('fish', fish)}
        ${renderGroup('deco', deco)}
      `}
    </div>
  `;
}

// S-037: the catalog as its own bottom-sheet window (🎁 dock button). Reuses the
// shared `.bottom-sheet` structure so bindSheetGrabber/bindSheetBackdrop drive
// it; the body is the same catalog grid that used to live in the ➕ sheet tab.
export function renderDefaultObjectsSheet(uiState) {
  if (!uiState?.isExpanded) {
    return '';
  }

  const stage = uiState.sheetStage === 'full' ? 'full' : 'peek';

  return `
    <div class="bottom-sheet-backdrop" aria-hidden="true"></div>
    <section
      class="default-objects-sheet bottom-sheet"
      data-sheet-stage="${stage}"
      data-touch-area="child"
      aria-labelledby="default-objects-title"
      role="dialog"
      aria-modal="false"
    >
      <button
        type="button"
        class="bottom-sheet-grabber"
        aria-label="${t('sheet.expand')}"
      >
        <span class="bottom-sheet-grabber-bar" aria-hidden="true"></span>
      </button>

      <header class="bottom-sheet-header">
        <div class="prop-panel-identity">
          <span class="prop-panel-thumb-icon" aria-hidden="true">🎁</span>
          <div class="prop-panel-title-group">
            <span id="default-objects-title" class="prop-panel-name">${t('catalog.title')}</span>
          </div>
        </div>
        <button class="prop-action-btn" type="button" data-close-catalog aria-label="${t('close')}" title="${t('close')}">×</button>
      </header>

      <div class="bottom-sheet-body">
        ${renderDefaultObjectsCatalog()}
      </div>

      <footer class="bottom-sheet-footer">
        <p class="bottom-sheet-footer-hint">${t('catalog.hint')}</p>
      </footer>
    </section>
  `;
}

