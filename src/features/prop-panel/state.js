const IS_DEV = import.meta.env.DEV;

const POSITION_KEY = 'my-fishbowl:prop-panel-pos';

function loadSavedPosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos.x === 'number' && typeof pos.y === 'number') {
      return {
        x: Math.max(0, Math.min(pos.x, window.innerWidth - 200)),
        y: Math.max(0, Math.min(pos.y, window.innerHeight - 80)),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function savePropPanelPosition(pos) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
    // storage unavailable
  }
}

export function createPropPanelState() {
  return {
    editingTarget: null,
    isAdvancedExpanded: false,
    position: loadSavedPosition(),
    godModeState: IS_DEV
      ? { thresholds: { light: 12, medium: 24, heavy: 48 } }
      : null,
  };
}

export function setEditingTarget(propPanelState, target) {
  propPanelState.editingTarget = target;
}
