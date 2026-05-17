import { escapeHtml } from '../../lib/utils.js';
import { DEFAULT_OBJECTS_MANIFEST } from '../../assets/default-objects/manifest.js';

function renderCard(entry) {
  const isFish = entry.type === 'fish';
  const typeIcon = isFish ? '🐟' : '🪨';
  const typeText = isFish ? '물고기' : '장식';
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
  const label = isFish ? '물고기' : '장식';
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

export function renderDefaultObjectsCatalog() {
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

