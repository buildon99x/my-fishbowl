import { escapeHtml } from '../../lib/utils.js';

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
