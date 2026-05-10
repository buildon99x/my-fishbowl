const PATTERNS = {
  light: 10,
  medium: 30,
  heavy: 50,
  'magic-b': 30,
};

function isHapticSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function playHaptic(pattern, getSettings) {
  if (!isHapticSupported()) return;
  const settings = getSettings ? getSettings() : null;
  if (settings && !settings.hapticEnabled) return;
  const value = typeof pattern === 'string' ? PATTERNS[pattern] : pattern;
  if (!value) return;
  try {
    navigator.vibrate(value);
  } catch {
    /* ignore */
  }
}
