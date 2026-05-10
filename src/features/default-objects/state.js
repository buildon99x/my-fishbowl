const CTA_SEEN_KEY = 'defaultObjects.cta.seen';
const DEBOUNCE_MS = 200;

export function createDefaultObjectsState() {
  return {
    open: false,
    lastClickAt: new Map(),
    pendingIds: new Set(),
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

