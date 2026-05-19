import {
  PENDING_DELETE_TIMEOUT_MS,
  commitPendingDelete,
  restoreProp,
  softDeleteProp,
  toggleFishHidden,
} from '../aquarium/fish-actions.js';

export function bindFishListEvents(root, aquarium, appState, { render }) {
  root.querySelector('[data-toggle-fish-list]')?.addEventListener('click', () => {
    appState.isFishListCollapsed = !appState.isFishListCollapsed;
    render();
  });

  root.querySelectorAll('[data-select-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const propId = button.dataset.selectFish;
      const target = aquarium.fishes.find((f) => f.id === propId);
      if (!target) return;
      appState.selectedFishId = propId;
      // S-030: a single tap on a list row also opens the prop-panel so the
      // selection + editing flow is unified across sprite/list entry points.
      const current = appState.propPanel.editingTarget;
      appState.propPanel.editingTarget =
        current?.id === propId
          ? null
          : { id: propId, type: target.type === 'deco' ? 'deco' : 'fish' };
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
      const propId = button.dataset.editFish;
      const target = aquarium.fishes.find((f) => f.id === propId);
      if (!target) return;
      appState.selectedFishId = propId;
      const current = appState.propPanel.editingTarget;
      appState.propPanel.editingTarget =
        current?.id === propId
          ? null
          : { id: propId, type: target.type === 'deco' ? 'deco' : 'fish' };
      render();
    });
  });

  root.querySelectorAll('[data-delete-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const propId = button.dataset.deleteFish;
      const target = aquarium.fishes.find((f) => f.id === propId);
      if (!target) return;

      softDeleteProp(aquarium, propId);
      if (appState.selectedFishId === propId) {
        appState.selectedFishId = null;
      }
      if (appState.propPanel.editingTarget?.id === propId) {
        appState.propPanel.editingTarget = null;
      }

      const undo = appState.undoDelete ?? (appState.undoDelete = {});
      if (undo.timerId) {
        window.clearTimeout(undo.timerId);
        if (undo.propId && undo.propId !== propId) {
          commitPendingDelete(aquarium, undo.propId);
        }
      }
      undo.visible = true;
      undo.propId = propId;
      undo.name = target.name;
      undo.timerId = window.setTimeout(() => {
        commitPendingDelete(aquarium, propId);
        undo.visible = false;
        undo.propId = null;
        undo.timerId = null;
        render();
      }, PENDING_DELETE_TIMEOUT_MS);

      render();
    });
  });

  root.querySelector('[data-undo-delete]')?.addEventListener('click', () => {
    const undo = appState.undoDelete;
    if (!undo?.propId) return;
    if (undo.timerId) window.clearTimeout(undo.timerId);
    restoreProp(aquarium, undo.propId);
    undo.visible = false;
    undo.propId = null;
    undo.timerId = null;
    render();
  });
}
