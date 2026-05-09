export const ONBOARDING_STORAGE_KEY = 'fishbowl.onboarding.v1';

const ONBOARDING_SEQUENCES = [1, 2, 3, 4, 5];

export function createDefaultOnboardingState() {
  return {
    completed: false,
    sequence: 1,
    completedAt: undefined,
    voiceGuideEnabled: false,
  };
}

export function loadOnboardingState() {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return createDefaultOnboardingState();
    const parsed = JSON.parse(raw);
    return normalizeOnboardingState(parsed);
  } catch {
    return createDefaultOnboardingState();
  }
}

export function normalizeOnboardingState(raw) {
  const defaults = createDefaultOnboardingState();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    completed: Boolean(raw.completed),
    sequence: ONBOARDING_SEQUENCES.includes(raw.sequence) ? raw.sequence : (raw.completed ? 'done' : 1),
    completedAt: raw.completedAt,
    voiceGuideEnabled: Boolean(raw.voiceGuideEnabled),
  };
}

export function saveOnboardingState(state) {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function advanceSequence(state, target) {
  if (state.completed) return state;
  state.sequence = target;
  if (target === 5 || target === 'done') {
    state.completed = true;
    state.sequence = 'done';
    state.completedAt = new Date().toISOString();
  }
  return state;
}

export function resetOnboarding(state) {
  state.completed = false;
  state.sequence = 1;
  state.completedAt = undefined;
  return state;
}

export function isOnboardingActive(state) {
  return !state.completed && state.sequence !== 'done';
}
