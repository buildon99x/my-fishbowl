import { addFoods, createFeedingState, createFoodsAt, tickFeeding } from './state.js';
import { clamp } from '../../lib/utils.js';
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
  const layer = root.querySelector('[data-fish-layer]');
  let lastDropAt = 0;

  toggleButton?.addEventListener('click', () => {
    state.feedingMode = !state.feedingMode;
    options.render?.();
  });

  root.addEventListener('click', (event) => {
    const paletteBtn = event.target.closest('[data-food-palette]');
    if (paletteBtn) {
      state.selectedType = paletteBtn.dataset.foodPalette;
      options.render?.();
    }
  });

  function dropFood(event) {
    const now = window.performance.now();

    if (now - lastDropAt < 120) {
      return;
    }

    const point = getLayerPoint(layer, event);

    addFoods(state, createFoodsAt(point.x, point.y, state.selectedType));
    state.lastTickAt = window.performance.now();
    lastDropAt = now;
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
