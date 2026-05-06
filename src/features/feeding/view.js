function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderFeedingControls(state) {
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
      <label class="feeding-type">
        <span>Food</span>
        <select data-food-type>
          <option value="basic" ${state.selectedType === 'basic' ? 'selected' : ''}>Basic</option>
        </select>
      </label>
      <span class="feeding-mode-hint">${state.feedingMode ? 'Click the water to drop food.' : 'Feed mode off'}</span>
    </div>
  `;
}

export function renderFoods(foods) {
  return foods
    .map(
      (food) => `
        <span
          class="food-pellet"
          data-food-id="${escapeHtml(food.id)}"
          data-food-type="${escapeHtml(food.type)}"
          style="--food-x: ${food.x}%; --food-y: ${food.y}%;"
          aria-hidden="true"
        ></span>
      `,
    )
    .join('');
}
