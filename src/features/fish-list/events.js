import { deleteFishFromAquarium, toggleFishHidden } from '../aquarium/fish-actions.js';

export function bindFishListEvents(root, aquarium, appState, { render }) {
  root.querySelector('[data-toggle-fish-list]')?.addEventListener('click', () => {
    appState.isFishListCollapsed = !appState.isFishListCollapsed;
    render();
  });

  root.querySelectorAll('[data-select-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      appState.selectedFishId = button.dataset.selectFish;
      render();
    });
  });

  root.querySelectorAll('[data-toggle-fish-hidden]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFishHidden(aquarium, button.dataset.toggleFishHidden);
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.editFish;
      appState.selectedFishId = fishId;
      const current = appState.propPanel.editingTarget;
      appState.propPanel.editingTarget =
        current?.type === 'fish' && current?.id === fishId
          ? null
          : { id: fishId, type: 'fish' };
      render();
    });
  });

  root.querySelectorAll('[data-delete-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.deleteFish;

      deleteFishFromAquarium(aquarium, fishId);
      if (appState.selectedFishId === fishId) {
        appState.selectedFishId = null;
      }
      if (appState.propPanel.editingTarget?.type === 'fish' && appState.propPanel.editingTarget?.id === fishId) {
        appState.propPanel.editingTarget = null;
      }
      render();
    });
  });
}
