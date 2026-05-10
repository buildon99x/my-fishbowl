import { describe, it, expect, beforeEach } from 'vitest';
import {
  advanceSequence,
  createDefaultOnboardingState,
  isOnboardingActive,
  loadOnboardingState,
  normalizeOnboardingState,
  ONBOARDING_STORAGE_KEY,
  resetOnboarding,
  saveOnboardingState,
} from './state.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
};

describe('onboarding state', () => {
  beforeEach(() => memory.clear());

  it('default state starts at sequence 1, not completed', () => {
    const s = createDefaultOnboardingState();
    expect(s.completed).toBe(false);
    expect(s.sequence).toBe(1);
    expect(isOnboardingActive(s)).toBe(true);
  });

  it('advanceSequence to 5 marks completed and stamps completedAt', () => {
    const s = createDefaultOnboardingState();
    advanceSequence(s, 5);
    expect(s.completed).toBe(true);
    expect(s.sequence).toBe('done');
    expect(s.completedAt).toBeTruthy();
    expect(isOnboardingActive(s)).toBe(false);
  });

  it('advanceSequence ignores changes once completed', () => {
    const s = createDefaultOnboardingState();
    advanceSequence(s, 'done');
    advanceSequence(s, 1);
    expect(s.sequence).toBe('done');
  });

  it('round-trips through localStorage', () => {
    const s = createDefaultOnboardingState();
    s.voiceGuideEnabled = true;
    advanceSequence(s, 3);
    saveOnboardingState(s);
    expect(memory.get(ONBOARDING_STORAGE_KEY)).toBeTruthy();
    const back = loadOnboardingState();
    expect(back.sequence).toBe(3);
    expect(back.voiceGuideEnabled).toBe(true);
  });

  it('resetOnboarding restarts the flow', () => {
    const s = createDefaultOnboardingState();
    advanceSequence(s, 'done');
    resetOnboarding(s);
    expect(s.sequence).toBe(1);
    expect(s.completed).toBe(false);
  });

  it('normalizeOnboardingState handles unknown sequence', () => {
    const s = normalizeOnboardingState({ completed: false, sequence: 99 });
    expect(s.sequence).toBe(1);
    const done = normalizeOnboardingState({ completed: true });
    expect(done.sequence).toBe('done');
  });
});
