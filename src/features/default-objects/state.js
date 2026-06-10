const CTA_SEEN_KEY = 'defaultObjects.cta.seen';
const DEBOUNCE_MS = 200;

export function createDefaultObjectsState() {
  // S-037: the catalog is its own bottom-sheet window again, reached from the
  // 🎁 dock button. Visibility lives here (same `{ isExpanded, sheetStage }`
  // shape as fishInputState) so the shared bottom-sheet helpers drive it.
  return {
    isExpanded: false,
    sheetStage: 'peek',
    lastClickAt: new Map(),
    ctaPulseShownThisSession: false,
  };
}

export function shouldShowCtaPulse(propsLength, state) {
  if (propsLength > 0) return false;
  if (state?.ctaPulseShownThisSession) return false;
  try {
    return localStorage.getItem(CTA_SEEN_KEY) !== 'true';
  } catch {
    return true;
  }
}

export function markCtaPulseShown(state) {
  if (state) state.ctaPulseShownThisSession = true;
}

export function markCtaSeen() {
  try {
    localStorage.setItem(CTA_SEEN_KEY, 'true');
  } catch {
    // storage unavailable
  }
}

export function checkDebounce(state, id, now) {
  const last = state.lastClickAt.get(id) ?? 0;
  if (now - last < DEBOUNCE_MS) return false;
  state.lastClickAt.set(id, now);
  return true;
}

