const IS_DEV = import.meta.env.DEV;

export function createPropPanelState() {
  return {
    editingTarget: null,
    isAdvancedExpanded: false,
    statusMessage: '',
    statusTimerId: null,
    // Tracks which target the persistent panel host is currently mounted for.
    // Same key across renders ⇒ inner content is patched instead of remounted,
    // so the slide-in animation does not replay on every interaction.
    _mountedKey: null,
    godModeState: IS_DEV
      ? { thresholds: { light: 12, medium: 24, heavy: 48 } }
      : null,
  };
}

const PROP_PANEL_STATUS_MS = 3500;

export function setPropPanelStatus(propPanelState, message, render) {
  if (propPanelState.statusTimerId) {
    window.clearTimeout(propPanelState.statusTimerId);
    propPanelState.statusTimerId = null;
  }
  propPanelState.statusMessage = message ?? '';
  if (!message) return;
  propPanelState.statusTimerId = window.setTimeout(() => {
    propPanelState.statusMessage = '';
    propPanelState.statusTimerId = null;
    render?.();
  }, PROP_PANEL_STATUS_MS);
}
