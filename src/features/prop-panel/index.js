export { createPropPanelState, setEditingTarget } from './state.js';
export { renderPropPanel, renderActionCluster } from './view.js';

import { bindCommonPanelEvents, bindFishPropsEvents, bindGodModePropsEvents } from './events.js';

export function bindActionClusterEvents(root, { fishInputState, propPanelState }, callbacks) {
  const { render, onFeedingToggle, onFoodTypeChange, onCleaningToggle } = callbacks;

  root.querySelector('[data-prop-feed]')?.addEventListener('click', () => {
    onFeedingToggle();
    render();
  });

  root.querySelector('[data-prop-food-type]')?.addEventListener('change', (e) => {
    onFoodTypeChange(e.target.value);
  });

  root.querySelector('[data-prop-add-fish]')?.addEventListener('click', () => {
    fishInputState.isExpanded = !fishInputState.isExpanded;
    render();
  });

  root.querySelector('[data-prop-cleaning]')?.addEventListener('click', () => {
    onCleaningToggle?.();
    render();
  });

  if (import.meta.env.DEV) {
    root.querySelector('[data-prop-godmode]')?.addEventListener('click', () => {
      const current = propPanelState.editingTarget;
      propPanelState.editingTarget = current?.type === 'godmode' ? null : { id: null, type: 'godmode' };
      render();
    });
  }
}

export function bindPropPanelEvents(root, aquarium, appState, saveAquarium, render) {
  bindCommonPanelEvents(root, appState, render);

  const { editingTarget } = appState.propPanel;
  if (!editingTarget) return;

  if (editingTarget.type === 'fish') {
    bindFishPropsEvents(root, aquarium, appState, saveAquarium, render);
    return;
  }

  if (import.meta.env.DEV) {
    bindGodModePropsEvents(root, aquarium, appState, saveAquarium, render);
  }
}
