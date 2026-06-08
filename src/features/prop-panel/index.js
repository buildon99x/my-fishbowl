export { createPropPanelState } from './state.js';
export { renderPropPanel, renderActionCluster } from './view.js';

import {
  bindCommonPanelEvents,
  bindDecoPropsEvents,
  bindFishPropsEvents,
  bindGodModePropsEvents,
  bindPropTypeSegmentedEvents,
} from './events.js';

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
    const next = !fishInputState.isExpanded;
    fishInputState.isExpanded = next;
    // S-037: direct drawing is the primary feature, so ➕ opens straight to the
    // "만들기"(create) tab at full height — the canvas is one tap away, no extra
    // tab-switch or scroll. The catalog stays one tab away.
    fishInputState.sheetStage = next ? 'full' : 'closed';
    if (next) {
      fishInputState.activeTab = 'create';
      // S-034: opening the ➕ sheet closes the prop-panel so the two bottom
      // surfaces don't stack on narrow screens.
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
