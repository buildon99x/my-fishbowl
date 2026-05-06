const HOUR_MS = 60 * 60 * 1000;

const CLEANLINESS_BY_LEVEL = [100, 70, 40, 10];

export const ALGAE_STATE_NAMES = ['clean', 'lightAlgae', 'mediumAlgae', 'heavyAlgae'];

export function calcAlgaeLevel(lastCleanedAt, nowMs) {
  try {
    const base = lastCleanedAt ? new Date(lastCleanedAt).getTime() : nowMs;
    if (!Number.isFinite(base)) return 0;
    const elapsed = nowMs - base;
    if (elapsed < 0) return 0;
    if (elapsed < 12 * HOUR_MS) return 0;
    if (elapsed < 24 * HOUR_MS) return 1;
    if (elapsed < 48 * HOUR_MS) return 2;
    return 3;
  } catch {
    return 0;
  }
}

export function calcCleanliness(algaeLevel) {
  return CLEANLINESS_BY_LEVEL[algaeLevel] ?? 100;
}

export function restoreAlgaeState(aquarium) {
  const level = calcAlgaeLevel(aquarium.lastCleanedAt, Date.now());
  aquarium.algaeLevel = level;
  aquarium.cleanliness = calcCleanliness(level);
}
