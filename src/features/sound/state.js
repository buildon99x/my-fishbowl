import { clamp } from '../../lib/utils.js';

export const SOUND_STORAGE_KEY = 'fishbowl.sound.v1';
export const SOUND_CATEGORIES = ['ambient', 'ui', 'interaction', 'magic'];
export const MASTER_VOLUME_CAP = 0.7;

const DEFAULT_CATEGORY_VOLUME = {
  ambient: 0.25,
  ui: 0.35,
  interaction: 0.45,
  magic: 0.55,
};

export function createDefaultSoundSettings() {
  return {
    masterEnabled: false,
    masterVolume: MASTER_VOLUME_CAP,
    categories: SOUND_CATEGORIES.reduce((acc, name) => {
      acc[name] = { enabled: false, volume: DEFAULT_CATEGORY_VOLUME[name] };
      return acc;
    }, {}),
    onboardingShown: false,
    hapticEnabled: true,
  };
}


export function normalizeSoundSettings(raw) {
  const defaults = createDefaultSoundSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const out = createDefaultSoundSettings();
  out.masterEnabled = Boolean(raw.masterEnabled);
  out.masterVolume = clamp(Number(raw.masterVolume ?? defaults.masterVolume), 0, MASTER_VOLUME_CAP);
  out.onboardingShown = Boolean(raw.onboardingShown);
  out.hapticEnabled = raw.hapticEnabled === undefined ? true : Boolean(raw.hapticEnabled);
  if (raw.categories && typeof raw.categories === 'object') {
    SOUND_CATEGORIES.forEach((name) => {
      const c = raw.categories[name];
      if (c && typeof c === 'object') {
        out.categories[name] = {
          enabled: Boolean(c.enabled),
          volume: clamp(Number(c.volume ?? defaults.categories[name].volume), 0, 1),
        };
      }
    });
  }
  return out;
}

export function loadSoundSettings() {
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (!raw) return createDefaultSoundSettings();
    return normalizeSoundSettings(JSON.parse(raw));
  } catch {
    return createDefaultSoundSettings();
  }
}

export function saveSoundSettings(settings) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function enableAllCategories(settings, enabled) {
  SOUND_CATEGORIES.forEach((name) => {
    settings.categories[name].enabled = enabled;
  });
  settings.masterEnabled = enabled;
}
