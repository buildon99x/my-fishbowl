const IS_DEV = import.meta.env.DEV;

export function createPropPanelState() {
  return {
    cleaningMode: false,
    editingTarget: null,
    isAdvancedExpanded: false,
    godModeState: IS_DEV
      ? { thresholds: { light: 12, medium: 24, heavy: 48 } }
      : null,
  };
}

export function setEditingTarget(propPanelState, target) {
  propPanelState.editingTarget = target;
}
