import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultSoundSettings,
  enableAllCategories,
  loadSoundSettings,
  MASTER_VOLUME_CAP,
  normalizeSoundSettings,
  saveSoundSettings,
  SOUND_CATEGORIES,
  SOUND_STORAGE_KEY,
} from './state.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
};

describe('sound state', () => {
  beforeEach(() => memory.clear());

  it('default settings are silent and on for haptic', () => {
    const s = createDefaultSoundSettings();
    expect(s.masterEnabled).toBe(false);
    expect(s.masterVolume).toBe(MASTER_VOLUME_CAP);
    expect(s.hapticEnabled).toBe(true);
    SOUND_CATEGORIES.forEach((name) => {
      expect(s.categories[name].enabled).toBe(false);
      expect(s.categories[name].volume).toBeGreaterThan(0);
    });
  });

  it('caps masterVolume at 0.7', () => {
    const s = normalizeSoundSettings({ masterVolume: 1.0 });
    expect(s.masterVolume).toBeLessThanOrEqual(MASTER_VOLUME_CAP);
  });

  it('round-trips through localStorage', () => {
    const s = createDefaultSoundSettings();
    s.masterEnabled = true;
    s.categories.ambient.enabled = true;
    saveSoundSettings(s);
    expect(memory.get(SOUND_STORAGE_KEY)).toBeTruthy();
    const back = loadSoundSettings();
    expect(back.masterEnabled).toBe(true);
    expect(back.categories.ambient.enabled).toBe(true);
  });

  it('enableAllCategories toggles every category', () => {
    const s = createDefaultSoundSettings();
    enableAllCategories(s, true);
    expect(s.masterEnabled).toBe(true);
    SOUND_CATEGORIES.forEach((name) => expect(s.categories[name].enabled).toBe(true));
    enableAllCategories(s, false);
    expect(s.masterEnabled).toBe(false);
    SOUND_CATEGORIES.forEach((name) => expect(s.categories[name].enabled).toBe(false));
  });
});
