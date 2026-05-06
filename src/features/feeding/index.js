import { addFood, clamp, createFeedingState, createFoodAt, tickFeeding } from './state.js';
import { renderFeedingControls, renderFoods } from './view.js';

export { createFeedingState, renderFeedingControls, renderFoods, tickFeeding };

function getLayerPoint(layer, event) {
  const rect = layer.getBoundingClientRect();

  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

export function bindFeedingEvents(root, state, options = {}) {
  const toggleButton = root.querySelector('[data-toggle-feeding]');
  const typeSelect = root.querySelector('[data-food-type]');
  const layer = root.querySelector('[data-fish-layer]');
  let lastDropAt = 0;

  toggleButton?.addEventListener('click', () => {
    state.feedingMode = !state.feedingMode;
    options.render?.();
  });

  typeSelect?.addEventListener('change', () => {
    state.selectedType = typeSelect.value;
  });

  function dropFood(event) {
    const now = window.performance.now();

    if (now - lastDropAt < 120) {
      return;
    }

    const point = getLayerPoint(layer, event);

    addFood(state, createFoodAt(point.x, point.y, state.selectedType));
    state.lastTickAt = window.performance.now();
    lastDropAt = now;
    options.render?.();
    options.startAnimation?.();
  }

  layer?.addEventListener('pointerdown', (event) => {
    if (!state.feedingMode || event.target.closest('[data-fish-sprite]')) {
      return;
    }

    event.preventDefault();
    layer.setPointerCapture(event.pointerId);
    dropFood(event);

    const handleDrag = (moveEvent) => {
      dropFood(moveEvent);
    };

    const finishDrag = () => {
      layer.releasePointerCapture(event.pointerId);
      layer.removeEventListener('pointermove', handleDrag);
      layer.removeEventListener('pointerup', finishDrag);
      layer.removeEventListener('pointercancel', finishDrag);
    };

    layer.addEventListener('pointermove', handleDrag);
    layer.addEventListener('pointerup', finishDrag);
    layer.addEventListener('pointercancel', finishDrag);
  });
}
