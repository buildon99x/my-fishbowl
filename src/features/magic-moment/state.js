export const MAGIC_PHASE_DURATIONS = {
  anticipating: 300,
  transforming: 800,
  welcoming: 1500,
  breath: 200,
};

export const MAGIC_QUEUE_MAX = 3;

export function createMagicMomentState() {
  return {
    phase: 'idle',
    targetFishId: null,
    startedAt: 0,
    queue: [],
    enabled: true,
    hiddenFishIds: new Set(),
  };
}

export function isMagicActive(state) {
  return state.phase !== 'idle';
}

export function enqueueMagicMoment(state, item) {
  if (state.queue.length >= MAGIC_QUEUE_MAX) return false;
  state.queue.push(item);
  return true;
}

export function dequeueMagicMoment(state) {
  return state.queue.shift() ?? null;
}
