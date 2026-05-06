export function trackAquariumMouse(root) {
  const layer = root.querySelector('[data-fish-layer]');
  const state = {
    isInside: false,
    x: 0,
    y: 0,
    widthPx: 1,
    heightPx: 1,
  };

  if (!layer) {
    return {
      getState: () => ({ ...state }),
      stop() {},
    };
  }

  const update = (event) => {
    const rect = layer.getBoundingClientRect();

    state.isInside = true;
    state.widthPx = Math.max(rect.width, 1);
    state.heightPx = Math.max(rect.height, 1);
    state.x = ((event.clientX - rect.left) / state.widthPx) * 100;
    state.y = ((event.clientY - rect.top) / state.heightPx) * 100;
  };

  const leave = () => {
    state.isInside = false;
  };

  layer.addEventListener('pointermove', update);
  layer.addEventListener('pointerenter', update);
  layer.addEventListener('pointerleave', leave);
  layer.addEventListener('pointercancel', leave);

  return {
    getState: () => ({ ...state }),
    stop() {
      layer.removeEventListener('pointermove', update);
      layer.removeEventListener('pointerenter', update);
      layer.removeEventListener('pointerleave', leave);
      layer.removeEventListener('pointercancel', leave);
    },
  };
}
