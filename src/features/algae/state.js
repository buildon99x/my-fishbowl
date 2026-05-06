const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const ALGAE_INTERVAL_MINUTES = 30;
export const ALGAE_MAX_HOURS = 48;
export const ALGAE_MAX_LEVEL = (ALGAE_MAX_HOURS * 60) / ALGAE_INTERVAL_MINUTES;

export const ALGAE_STATE_NAMES = ['clean', 'lightAlgae', 'mediumAlgae', 'heavyAlgae'];

export const DEFAULT_ALGAE_THRESHOLDS = {
  intervalMinutes: ALGAE_INTERVAL_MINUTES,
  maxHours: ALGAE_MAX_HOURS,
};

export function calcAlgaeLevel(lastCleanedAt, nowMs, thresholds = DEFAULT_ALGAE_THRESHOLDS) {
  const intervalMinutes = thresholds?.intervalMinutes ?? ALGAE_INTERVAL_MINUTES;
  const maxHours = thresholds?.maxHours ?? ALGAE_MAX_HOURS;
  try {
    const base = lastCleanedAt ? new Date(lastCleanedAt).getTime() : nowMs;
    if (!Number.isFinite(base)) return 0;
    const elapsed = nowMs - base;
    if (elapsed < 0) return 0;

    const intervalMs = Math.max(1, intervalMinutes) * MINUTE_MS;
    const maxLevel = Math.floor((Math.max(0, maxHours) * HOUR_MS) / intervalMs);
    return Math.min(maxLevel, Math.floor(elapsed / intervalMs));
  } catch {
    return 0;
  }
}

export function calcCleanliness(algaeLevel) {
  const level = Math.min(ALGAE_MAX_LEVEL, Math.max(0, Math.floor(algaeLevel)));
  if (level === 0) return 100;
  return Math.round(100 - (level / ALGAE_MAX_LEVEL) * 90);
}

export function getAlgaeStateName(algaeLevel) {
  const level = Math.min(ALGAE_MAX_LEVEL, Math.max(0, Math.floor(algaeLevel)));
  if (level === 0) return ALGAE_STATE_NAMES[0];
  if (level < ALGAE_MAX_LEVEL / 3) return ALGAE_STATE_NAMES[1];
  if (level < (ALGAE_MAX_LEVEL * 2) / 3) return ALGAE_STATE_NAMES[2];
  return ALGAE_STATE_NAMES[3];
}

export function calcLastCleanedAtForAlgaeLevel(algaeLevel, nowMs, intervalMinutes = ALGAE_INTERVAL_MINUTES) {
  const level = Math.min(ALGAE_MAX_LEVEL, Math.max(0, Math.floor(algaeLevel)));
  const intervalMs = Math.max(1, intervalMinutes) * MINUTE_MS;
  return new Date(nowMs - level * intervalMs).toISOString();
}

export function restoreAlgaeState(aquarium, thresholds) {
  const level = calcAlgaeLevel(aquarium.lastCleanedAt, Date.now(), thresholds);
  aquarium.algaeLevel = level;
  aquarium.cleanliness = calcCleanliness(level);
}
