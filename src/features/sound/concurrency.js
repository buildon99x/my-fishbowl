const RATE_LIMIT_MS = 100;
const MAX_CONCURRENT = 8;

export function createConcurrencyState() {
  return {
    lastTriggerAt: new Map(),
    active: [],
  };
}

export function shouldRateLimit(state, soundId, now) {
  const last = state.lastTriggerAt.get(soundId);
  if (last !== undefined && now - last < RATE_LIMIT_MS) return true;
  state.lastTriggerAt.set(soundId, now);
  return false;
}

export function registerActive(state, entry) {
  if (state.active.length >= MAX_CONCURRENT) {
    const evictableIdx = state.active.findIndex((e) => e.category !== 'magic');
    if (evictableIdx === -1) {
      if (entry.category === 'magic') {
        state.active.push(entry);
        return { evicted: null, accepted: true };
      }
      return { evicted: null, accepted: false };
    }
    const [evicted] = state.active.splice(evictableIdx, 1);
    state.active.push(entry);
    return { evicted, accepted: true };
  }
  state.active.push(entry);
  return { evicted: null, accepted: true };
}

export function releaseActive(state, entry) {
  const idx = state.active.indexOf(entry);
  if (idx !== -1) state.active.splice(idx, 1);
}

export const SOUND_CONFIG = {
  RATE_LIMIT_MS,
  MAX_CONCURRENT,
};
