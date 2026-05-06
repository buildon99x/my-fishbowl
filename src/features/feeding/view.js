import { FOOD_CONFIGS, FOOD_TYPES } from './foodConfig.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderFeedingControls(state) {
  const paletteHtml = state.feedingMode
    ? `<div class="food-palette" role="group" aria-label="먹이 종류">
        ${FOOD_TYPES.map((type) => {
          const config = FOOD_CONFIGS[type];
          const selected = state.selectedType === type;
          return `<button
            class="food-palette-item${selected ? ' food-palette-item--selected' : ''}"
            type="button"
            data-food-palette="${escapeHtml(type)}"
            aria-pressed="${selected}"
            aria-label="${escapeHtml(config.label)}"
            title="${escapeHtml(config.label)}"
          ><img src="${escapeHtml(config.assets[0])}" alt="" width="24" height="24" aria-hidden="true"></button>`;
        }).join('')}
      </div>`
    : '';

  return `
    <div class="feeding-controls" aria-label="Feeding controls">
      <button
        class="button ${state.feedingMode ? 'button-primary' : 'button-secondary'}"
        type="button"
        data-toggle-feeding
        aria-pressed="${state.feedingMode}"
      >
        Feed
      </button>
      ${paletteHtml}
      <span class="feeding-mode-hint">${state.feedingMode ? 'Click the water to drop food.' : 'Feed mode off'}</span>
    </div>
  `;
}

export function renderFoods(foods) {
  return foods
    .map(
      (food) => `
        <span
          class="food-pellet food-pellet--${escapeHtml(food.type)}"
          data-food-id="${escapeHtml(food.id)}"
          data-food-type="${escapeHtml(food.type)}"
          style="--food-x: ${food.x}%; --food-y: ${food.y}%; --food-rotation: ${food.rotation ?? 0}deg;"
          aria-hidden="true"
        ></span>
      `,
    )
    .join('');
}
