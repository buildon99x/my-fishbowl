export { createPropPanelState } from './state.js';
export { renderPropPanel } from './view.js';

export function bindPropPanelEvents(root, { fishInputState, propPanelState }, callbacks) {
  const { render, onFeedingToggle, onFoodTypeChange } = callbacks;

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
    propPanelState.cleaningMode = !propPanelState.cleaningMode;
    render();
  });

  root.querySelector('[data-prop-godmode]')?.addEventListener('click', () => {
    propPanelState.godModeOpen = !propPanelState.godModeOpen;
    render();
  });
}
