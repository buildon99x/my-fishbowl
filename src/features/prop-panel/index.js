export { createPropPanelState } from './state.js';
export { renderPropPanel, renderActionCluster } from './view.js';

import {
  bindCommonPanelEvents,
  bindDecoPropsEvents,
  bindFishPropsEvents,
  bindGodModePropsEvents,
  bindPropTypeSegmentedEvents,
} from './events.js';

export function bindActionClusterEvents(root, { fishInputState, defaultObjectsState, propPanelState }, callbacks) {
  const { render, onFeedingToggle, onFoodTypeChange, onCleaningToggle } = callbacks;

  root.querySelector('[data-prop-feed]')?.addEventListener('click', () => {
    onFeedingToggle();
    render();
  });

  root.querySelector('[data-prop-food-type]')?.addEventListener('change', (e) => {
    onFoodTypeChange(e.target.value);
  });

  // S-037: 🎁 catalog and ✏️ create are separate windows. Opening either closes
  // the other window and the prop-panel — only one bottom surface at a time.
  root.querySelector('[data-prop-catalog]')?.addEventListener('click', () => {
    const next = !defaultObjectsState.isExpanded;
    defaultObjectsState.isExpanded = next;
    defaultObjectsState.sheetStage = next ? 'peek' : 'closed';
    if (next) {
      fishInputState.isExpanded = false;
      propPanelState.editingTarget = null;
    }
    render();
  });

  root.querySelector('[data-prop-create]')?.addEventListener('click', () => {
    const next = !fishInputState.isExpanded;
    fishInputState.isExpanded = next;
    fishInputState.sheetStage = next ? 'peek' : 'closed';
    if (next) {
      defaultObjectsState.isExpanded = false;
      propPanelState.editingTarget = null;
    }
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

export function bindPropPanelEvents(root, aquarium, appState, saveAquarium, render, options = {}) {
  bindCommonPanelEvents(root, appState, render);

  const { editingTarget } = appState.propPanel;
  if (!editingTarget) return;

  bindPropTypeSegmentedEvents(root, aquarium, appState, saveAquarium, render, options.feedingState);

  if (editingTarget.type === 'fish') {
    bindFishPropsEvents(root, aquarium, appState, saveAquarium, render);
    return;
  }

  if (editingTarget.type === 'deco') {
    bindDecoPropsEvents(root, aquarium, appState, saveAquarium, render);
    return;
  }

  if (import.meta.env.DEV) {
    bindGodModePropsEvents(root, aquarium, appState, saveAquarium, render);
  }
}
