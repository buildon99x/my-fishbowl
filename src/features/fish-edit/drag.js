import { getFishById, updateFishAppearance } from '../aquarium/fish-actions.js';
import { clamp } from '../../lib/utils.js';

const LONG_PRESS_MS = 500;
const TAP_MOVE_THRESHOLD_PX = 6;
const LONG_PRESS_HINT_KEY = 'my-fishbowl:long-press-hint-shown';
const TOAST_DURATION_MS = 4000;

function getEditableType(target) {
  if (!target) return null;
  if (target.type === 'fish' || target.type === 'deco') return target.type;
  return null;
}

function shouldShowLongPressHint() {
  try {
    return localStorage.getItem(LONG_PRESS_HINT_KEY) !== 'true';
  } catch {
    return false;
  }
}

function markLongPressHintShown() {
  try {
    localStorage.setItem(LONG_PRESS_HINT_KEY, 'true');
  } catch {
    // storage unavailable
  }
}

function showLongPressToast(root) {
  if (!shouldShowLongPressHint()) return;
  if (root.querySelector('[data-long-press-toast]')) return;
  const toast = document.createElement('div');
  toast.className = 'long-press-toast';
  toast.setAttribute('data-long-press-toast', '');
  toast.setAttribute('role', 'status');
  toast.textContent = '꾹 눌러 옮길 수 있어요';
  root.appendChild(toast);
  markLongPressHintShown();
  window.setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}

function openPropPanel(appState, fishId, type) {
  appState.propPanel.editingTarget = { id: fishId, type };
  appState.selectedFishId = fishId;
}

function dismissPropPanel(appState) {
  appState.propPanel.editingTarget = null;
  appState.selectedFishId = null;
}

function bindPinchResize(sprite, aquarium, fishId, appState, render) {
  const activePointers = new Map();
  let initialDistance = 0;
  let initialSize = 1;

  sprite.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      initialDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const fish = getFishById(aquarium, fishId);
      initialSize = fish?.size ?? 1;
    }
  });

  sprite.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size !== 2 || initialDistance === 0) return;
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const scale = dist / initialDistance;
    // fish.size is stored in pixels; the panel slider range is 60..220.
    const nextSize = clamp(initialSize * scale, 60, 220);
    const fish = getFishById(aquarium, fishId);
    if (!fish) return;
    fish.size = nextSize;
    sprite.style.setProperty('--fish-size', `${nextSize}px`);
    const slider = document.querySelector('.prop-panel input[type="range"][data-prop-size]');
    if (slider) slider.value = String(nextSize);
  });

  const end = (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2 && initialDistance > 0) {
      initialDistance = 0;
      const fish = getFishById(aquarium, fishId);
      if (fish) updateFishAppearance(aquarium, fishId, { size: fish.size });
      render();
    }
  };
  sprite.addEventListener('pointerup', end);
  sprite.addEventListener('pointercancel', end);
}

export function bindFishSpriteDrag(root, aquarium, appState, { render }) {
  // Background tap (empty area inside bowl) dismisses the prop-panel.
  const bowl = root.querySelector('.aquarium-bowl');
  bowl?.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.closest('[data-fish-sprite]')) return;
    if (event.target.closest('.prop-panel')) return;
    if (event.target.closest('.fish-input-widget')) return;
    if (!appState.propPanel.editingTarget) return;
    dismissPropPanel(appState);
    render();
  });

  root.querySelectorAll('[data-fish-sprite]').forEach((sprite) => {
    const fishId = sprite.dataset.fishSprite;
    const type = sprite.dataset.propType === 'deco' ? 'deco' : 'fish';

    bindPinchResize(sprite, aquarium, fishId, appState, render);

    sprite.addEventListener('pointerdown', (event) => {
      if (event.isPrimary === false) return; // pinch handled separately
      const startX = event.clientX;
      const startY = event.clientY;
      let longPressTimer = null;
      let dragging = false;
      let moved = false;

      const { editingTarget } = appState.propPanel;
      const isAlreadyEditing =
        getEditableType(editingTarget) &&
        editingTarget?.id === fishId;

      const layer = root.querySelector('[data-fish-layer]');
      const fish = getFishById(aquarium, fishId);
      if (!layer || !fish) return;

      const startLongPress = () => {
        longPressTimer = window.setTimeout(() => {
          dragging = true;
          sprite.classList.add('is-dragging');
          appState.sound?.playHaptic?.('medium');
          try { sprite.setPointerCapture(event.pointerId); } catch { /* ignore */ }
        }, LONG_PRESS_MS);
      };

      const cancelLongPress = () => {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!moved && Math.hypot(dx, dy) >= TAP_MOVE_THRESHOLD_PX) {
          moved = true;
          if (!dragging) cancelLongPress();
        }
        if (!dragging) return;
        const rect = layer.getBoundingClientRect();
        const x = clamp(((moveEvent.clientX - rect.left) / rect.width) * 100, 4, 96);
        const y = clamp(((moveEvent.clientY - rect.top) / rect.height) * 100, 6, 94);
        fish.x = x;
        fish.y = y;
        sprite.style.setProperty('--fish-x', `${x}%`);
        sprite.style.setProperty('--fish-y', `${y}%`);
      };

      const finish = () => {
        cancelLongPress();
        sprite.removeEventListener('pointermove', onMove);
        sprite.removeEventListener('pointerup', finish);
        sprite.removeEventListener('pointercancel', finish);
        sprite.classList.remove('is-dragging');
        try { sprite.releasePointerCapture(event.pointerId); } catch { /* ignore */ }

        if (dragging) {
          updateFishAppearance(aquarium, fishId, { x: fish.x, y: fish.y });
          render();
          return;
        }

        if (!moved) {
          // Tap: open prop-panel for this sprite.
          if (isAlreadyEditing) {
            dismissPropPanel(appState);
          } else {
            openPropPanel(appState, fishId, type);
            showLongPressToast(root);
          }
          render();
        }
      };

      startLongPress();
      sprite.addEventListener('pointermove', onMove);
      sprite.addEventListener('pointerup', finish);
      sprite.addEventListener('pointercancel', finish);
    });
  });
}
