import { DEFAULT_ALGAE_THRESHOLDS, restoreAlgaeState } from '../algae/index.js';
import { savePropPanelPosition } from './state.js';
import { clamp } from '../../lib/utils.js';

function getFishByTarget(aquarium, target) {
  if (!target || target.type !== 'fish') return null;
  return aquarium.fishes.find((f) => f.id === target.id) ?? null;
}

function updateFish(aquarium, target, patch, saveAquarium) {
  aquarium.fishes = aquarium.fishes.map((f) =>
    f.id === target.id ? { ...f, ...patch } : f,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

function thresholdsToAlgaeParams(thresholds) {
  const heavy = Math.max(1, thresholds.heavy);
  const maxLevel = Math.round((DEFAULT_ALGAE_THRESHOLDS.maxHours * 60) / DEFAULT_ALGAE_THRESHOLDS.intervalMinutes);
  const intervalMinutes = Math.max(1, Math.round((heavy * 60) / maxLevel));
  return { intervalMinutes, maxHours: heavy };
}

export function bindFishPropsEvents(root, aquarium, appState, saveAquarium, render) {
  const panel = root.querySelector('.prop-panel');
  if (!panel) return;

  const { editingTarget } = appState.propPanel;
  if (!editingTarget || editingTarget.type !== 'fish') return;

  panel.querySelector('[data-edit-prop-name]')?.addEventListener('input', (e) => {
    updateFish(aquarium, editingTarget, { name: e.target.value }, saveAquarium);
  });

  panel.querySelector('[data-edit-prop-name]')?.addEventListener('change', (e) => {
    const trimmed = e.target.value.trim();
    if (!trimmed) {
      updateFish(aquarium, editingTarget, { name: '이름 없는 물고기' }, saveAquarium);
      e.target.value = '이름 없는 물고기';
    }
    render();
  });

  panel.querySelector('[data-edit-prop-size]')?.addEventListener('input', (e) => {
    const size = Number(e.target.value);
    updateFish(aquarium, editingTarget, { size }, saveAquarium);
    const display = panel.querySelector('[data-prop-size-value]');
    if (display) display.textContent = `${size}px`;
    const sprite = root.querySelector(`[data-fish-sprite="${editingTarget.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-size', `${size}px`);
  });

  panel.querySelector('[data-edit-prop-rotation]')?.addEventListener('input', (e) => {
    const rotation = Number(e.target.value);
    updateFish(aquarium, editingTarget, { rotation }, saveAquarium);
    const display = panel.querySelector('[data-prop-rotation-value]');
    if (display) display.textContent = `${rotation}°`;
    const sprite = root.querySelector(`[data-fish-sprite="${editingTarget.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-rotation', `${rotation}deg`);
  });

  panel.querySelector('[data-edit-prop-scale-x]')?.addEventListener('input', (e) => {
    const scaleX = Number(e.target.value);
    updateFish(aquarium, editingTarget, { scaleX }, saveAquarium);
    const display = panel.querySelector('[data-prop-scale-x-value]');
    if (display) display.textContent = scaleX.toFixed(2);
    const sprite = root.querySelector(`[data-fish-sprite="${editingTarget.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-scale-x', String(scaleX));
  });

  panel.querySelector('[data-edit-prop-scale-y]')?.addEventListener('input', (e) => {
    const scaleY = Number(e.target.value);
    updateFish(aquarium, editingTarget, { scaleY }, saveAquarium);
    const display = panel.querySelector('[data-prop-scale-y-value]');
    if (display) display.textContent = scaleY.toFixed(2);
    const sprite = root.querySelector(`[data-fish-sprite="${editingTarget.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-scale-y', String(scaleY));
  });

  panel.querySelectorAll('[data-edit-prop-head-direction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.editPropHeadDirection;
      updateFish(aquarium, editingTarget, { headDirection: direction }, saveAquarium);
      render();
    });
  });

  panel.querySelector('[data-edit-prop-movement]')?.addEventListener('change', (e) => {
    updateFish(aquarium, editingTarget, { movementEnabled: e.target.checked }, saveAquarium);
    render();
  });

  panel.querySelector('[data-flip-prop]')?.addEventListener('click', () => {
    const fish = getFishByTarget(aquarium, editingTarget);
    if (!fish) return;
    updateFish(aquarium, editingTarget, { flipped: !fish.flipped }, saveAquarium);
    render();
  });

  panel.querySelector('[data-flip-prop-y]')?.addEventListener('click', () => {
    const fish = getFishByTarget(aquarium, editingTarget);
    if (!fish) return;
    updateFish(aquarium, editingTarget, { flippedY: !fish.flippedY }, saveAquarium);
    render();
  });

  panel.querySelector('[data-reset-prop-transform]')?.addEventListener('click', () => {
    updateFish(aquarium, editingTarget, {
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipped: false,
      flippedY: false,
      size: 120,
    }, saveAquarium);
    render();
  });
}

export function bindGodModePropsEvents(root, aquarium, appState, saveAquarium, render) {
  const panel = root.querySelector('.prop-panel');
  if (!panel) return;

  const { editingTarget, godModeState } = appState.propPanel;
  if (!editingTarget || editingTarget.type !== 'godmode' || !godModeState) return;

  function applyThresholds() {
    const params = thresholdsToAlgaeParams(godModeState.thresholds);
    restoreAlgaeState(aquarium, params);
    aquarium.updatedAt = new Date().toISOString();
    saveAquarium(aquarium);
    render();
  }

  panel.querySelector('[data-edit-prop-threshold-light]')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val) || val < 0) return;
    godModeState.thresholds.light = val;
    if (godModeState.thresholds.medium <= val) godModeState.thresholds.medium = val + 1;
    if (godModeState.thresholds.heavy <= godModeState.thresholds.medium) {
      godModeState.thresholds.heavy = godModeState.thresholds.medium + 1;
    }
    applyThresholds();
  });

  panel.querySelector('[data-edit-prop-threshold-medium]')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val) || val <= godModeState.thresholds.light) return;
    godModeState.thresholds.medium = val;
    if (godModeState.thresholds.heavy <= val) godModeState.thresholds.heavy = val + 1;
    applyThresholds();
  });

  panel.querySelector('[data-edit-prop-threshold-heavy]')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val) || val <= godModeState.thresholds.medium) return;
    godModeState.thresholds.heavy = val;
    applyThresholds();
  });

  panel.querySelector('[data-reset-prop-thresholds]')?.addEventListener('click', () => {
    godModeState.thresholds = { light: 12, medium: 24, heavy: 48 };
    applyThresholds();
  });
}

export function bindCommonPanelEvents(root, appState, render) {
  root.querySelector('[data-close-prop-panel]')?.addEventListener('click', () => {
    appState.propPanel.editingTarget = null;
    render();
  });

  const panel = root.querySelector('.prop-panel');
  if (panel) bindPropPanelDrag(panel, appState.propPanel);
}

function bindPropPanelDrag(panel, propPanelState) {
  const header = panel.querySelector('.prop-panel-header');
  if (!header) return;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-close-prop-panel]')) return;
    e.preventDefault();

    const rect = panel.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    panel.style.right = 'auto';
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    header.style.cursor = 'grabbing';
    header.setPointerCapture(e.pointerId);

    function onMove(moveEvent) {
      const x = clamp(moveEvent.clientX - offsetX, 0, window.innerWidth - panel.offsetWidth);
      const y = clamp(moveEvent.clientY - offsetY, 0, window.innerHeight - panel.offsetHeight);
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
    }

    function onUp() {
      header.releasePointerCapture(e.pointerId);
      header.removeEventListener('pointermove', onMove);
      header.removeEventListener('pointerup', onUp);
      header.style.cursor = '';

      const pos = {
        x: parseFloat(panel.style.left),
        y: parseFloat(panel.style.top),
      };
      propPanelState.position = pos;
      savePropPanelPosition(pos);
    }

    header.addEventListener('pointermove', onMove);
    header.addEventListener('pointerup', onUp);
  });
}
