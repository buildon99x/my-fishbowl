import { DEFAULT_ALGAE_THRESHOLDS, restoreAlgaeState } from '../algae/index.js';
import { setPropPanelStatus } from './state.js';
import { updateFishAppearance, updatePropType } from '../aquarium/fish-actions.js';
import { DEFAULT_DECO_DEFAULTS, DEFAULT_FISH_DEFAULTS } from '../aquarium/model.js';
import { getFishThumbTransform } from '../../lib/fishSpriteStyle.js';

function updateThumbTransforms(root, fish) {
  const transform = getFishThumbTransform(fish);
  const listThumb = root.querySelector(`[data-fish-id="${fish.id}"] .fish-list-thumb`);
  if (listThumb) listThumb.style.transform = transform;
  const panelThumb = document.querySelector('.prop-panel-thumb');
  if (panelThumb) panelThumb.style.transform = transform;
}

function getFishByTarget(aquarium, target) {
  if (!target || (target.type !== 'fish' && target.type !== 'deco')) return null;
  return aquarium.fishes.find((f) => f.id === target.id) ?? null;
}

function thresholdsToAlgaeParams(thresholds) {
  const heavy = Math.max(1, thresholds.heavy);
  const maxLevel = Math.round((DEFAULT_ALGAE_THRESHOLDS.maxHours * 60) / DEFAULT_ALGAE_THRESHOLDS.intervalMinutes);
  const intervalMinutes = Math.max(1, Math.round((heavy * 60) / maxLevel));
  return { intervalMinutes, maxHours: heavy };
}

function bindCommonTransformEvents(root, panel, aquarium, target, saveAquarium, render, options = {}) {
  const defaultName = options.defaultName ?? '이름 없는 오브젝트';
  const onTransformChange = options.onTransformChange ?? null;

  panel.querySelector('[data-edit-prop-name]')?.addEventListener('input', (e) => {
    updateFishAppearance(aquarium, target.id, { name: e.target.value });
  });

  panel.querySelector('[data-edit-prop-name]')?.addEventListener('change', (e) => {
    const trimmed = e.target.value.trim();
    if (!trimmed) {
      updateFishAppearance(aquarium, target.id, { name: defaultName });
      e.target.value = defaultName;
    }
    render();
  });

  panel.querySelector('[data-edit-prop-size]')?.addEventListener('input', (e) => {
    const size = Number(e.target.value);
    updateFishAppearance(aquarium, target.id, { size });
    const display = panel.querySelector('[data-prop-size-value]');
    if (display) display.textContent = `${size}px`;
    const sprite = root.querySelector(`[data-fish-sprite="${target.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-size', `${size}px`);
  });

  panel.querySelector('[data-edit-prop-rotation]')?.addEventListener('input', (e) => {
    const rotation = Number(e.target.value);
    updateFishAppearance(aquarium, target.id, { rotation });
    const display = panel.querySelector('[data-prop-rotation-value]');
    if (display) display.textContent = `${rotation}°`;
    const sprite = root.querySelector(`[data-fish-sprite="${target.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-rotation', `${rotation}deg`);
    onTransformChange?.();
  });

  panel.querySelector('[data-edit-prop-scale-x]')?.addEventListener('input', (e) => {
    const scaleX = Number(e.target.value);
    updateFishAppearance(aquarium, target.id, { scaleX });
    const display = panel.querySelector('[data-prop-scale-x-value]');
    if (display) display.textContent = scaleX.toFixed(2);
    const sprite = root.querySelector(`[data-fish-sprite="${target.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-scale-x', String(scaleX));
    onTransformChange?.();
  });

  panel.querySelector('[data-edit-prop-scale-y]')?.addEventListener('input', (e) => {
    const scaleY = Number(e.target.value);
    updateFishAppearance(aquarium, target.id, { scaleY });
    const display = panel.querySelector('[data-prop-scale-y-value]');
    if (display) display.textContent = scaleY.toFixed(2);
    const sprite = root.querySelector(`[data-fish-sprite="${target.id}"]`);
    if (sprite) sprite.style.setProperty('--fish-scale-y', String(scaleY));
    onTransformChange?.();
  });

  panel.querySelector('[data-flip-prop]')?.addEventListener('click', () => {
    const item = getFishByTarget(aquarium, target);
    if (!item) return;
    updateFishAppearance(aquarium, target.id, { flipped: !item.flipped });
    render();
  });

  panel.querySelector('[data-flip-prop-y]')?.addEventListener('click', () => {
    const item = getFishByTarget(aquarium, target);
    if (!item) return;
    updateFishAppearance(aquarium, target.id, { flippedY: !item.flippedY });
    render();
  });

  panel.querySelector('[data-reset-prop-transform]')?.addEventListener('click', () => {
    const defaultSize = target.type === 'deco' ? DEFAULT_DECO_DEFAULTS.size : DEFAULT_FISH_DEFAULTS.size;
    updateFishAppearance(aquarium, target.id, {
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipped: false,
      flippedY: false,
      size: defaultSize,
    });
    render();
  });
}

export function bindPropTypeSegmentedEvents(root, aquarium, appState, saveAquarium, render, feedingState) {
  const panel = document.querySelector('.prop-panel');
  if (!panel) return;
  const { editingTarget } = appState.propPanel;
  if (!editingTarget || (editingTarget.type !== 'fish' && editingTarget.type !== 'deco')) return;

  panel.querySelectorAll('[data-edit-prop-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.editPropType === 'deco' ? 'deco' : 'fish';
      if (editingTarget.type === next) return;
      const changed = updatePropType(aquarium, editingTarget.id, next);
      if (!changed) return;
      editingTarget.type = next;
      if (next === 'deco' && feedingState && feedingState.fishEating === editingTarget.id) {
        feedingState.fishEating = null;
      }
      const message = next === 'deco'
        ? '장식으로 바뀌었어요. 이제 움직이지 않아요.'
        : '물고기로 바뀌었어요. 다시 헤엄칠 수 있어요.';
      setPropPanelStatus(appState.propPanel, message, render);
      render();
    });
  });
}

export function bindDecoPropsEvents(root, aquarium, appState, saveAquarium, render) {
  const panel = document.querySelector('.prop-panel');
  if (!panel) return;
  const { editingTarget } = appState.propPanel;
  if (!editingTarget || editingTarget.type !== 'deco') return;
  bindCommonTransformEvents(root, panel, aquarium, editingTarget, saveAquarium, render);
}

export function bindFishPropsEvents(root, aquarium, appState, saveAquarium, render) {
  const panel = document.querySelector('.prop-panel');
  if (!panel) return;

  const { editingTarget } = appState.propPanel;
  if (!editingTarget || editingTarget.type !== 'fish') return;

  bindCommonTransformEvents(root, panel, aquarium, editingTarget, saveAquarium, render, {
    defaultName: '이름 없는 물고기',
    onTransformChange: () => {
      const fish = getFishByTarget(aquarium, editingTarget);
      if (fish) updateThumbTransforms(root, fish);
    },
  });

  panel.querySelectorAll('[data-edit-prop-head-direction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.editPropHeadDirection;
      updateFishAppearance(aquarium, editingTarget.id, { headDirection: direction });
      render();
    });
  });

  panel.querySelector('[data-edit-prop-movement]')?.addEventListener('change', (e) => {
    updateFishAppearance(aquarium, editingTarget.id, { movementEnabled: e.target.checked });
    render();
  });
}

export function bindGodModePropsEvents(root, aquarium, appState, saveAquarium, render) {
  const panel = document.querySelector('.prop-panel');
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
  // Panel lives on document.body now (S-034 follow-up), not inside #app root.
  document.querySelector('[data-close-prop-panel]')?.addEventListener('click', () => {
    appState.propPanel.editingTarget = null;
    render();
  });
}
