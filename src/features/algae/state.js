const HOUR_MS = 60 * 60 * 1000;

const CLEANLINESS_BY_LEVEL = [100, 70, 40, 10];

export const ALGAE_STATE_NAMES = ['clean', 'lightAlgae', 'mediumAlgae', 'heavyAlgae'];

export const DEFAULT_ALGAE_THRESHOLDS = { light: 12, medium: 24, heavy: 48 };

export function calcAlgaeLevel(lastCleanedAt, nowMs, thresholds = DEFAULT_ALGAE_THRESHOLDS) {
  const { light, medium, heavy } = thresholds;
  try {
    const base = lastCleanedAt ? new Date(lastCleanedAt).getTime() : nowMs;
    if (!Number.isFinite(base)) return 0;
    const elapsed = nowMs - base;
    if (elapsed < 0) return 0;
    if (elapsed < light * HOUR_MS) return 0;
    if (elapsed < medium * HOUR_MS) return 1;
    if (elapsed < heavy * HOUR_MS) return 2;
    return 3;
  } catch {
    return 0;
  }
}

export function calcCleanliness(algaeLevel) {
  return CLEANLINESS_BY_LEVEL[algaeLevel] ?? 100;
}

export function restoreAlgaeState(aquarium, thresholds) {
  const level = calcAlgaeLevel(aquarium.lastCleanedAt, Date.now(), thresholds);
  aquarium.algaeLevel = level;
  aquarium.cleanliness = calcCleanliness(level);
}
