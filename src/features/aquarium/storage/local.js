import { createAquarium, normalizeAquarium } from '../model.js';

const STORAGE_KEY = 'my-fishbowl:aquarium';

/**
 * Loads the aquarium from localStorage.
 * Falls back to a fresh default aquarium on parse error or empty storage.
 *
 * @returns {import('../model.js').Aquarium}
 */
export function loadAquarium() {
  try {
    const savedAquarium = localStorage.getItem(STORAGE_KEY);

    if (!savedAquarium) {
      return createAquarium();
    }

    return normalizeAquarium(JSON.parse(savedAquarium));
  } catch (error) {
    console.warn('Saved aquarium data could not be loaded.', error);
    return createAquarium();
  }
}

/**
 * Persists the aquarium to localStorage.
 *
 * @param {import('../model.js').Aquarium} aquarium
 */
export function saveAquarium(aquarium) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aquarium));
  } catch (error) {
    console.warn('Aquarium data could not be saved.', error);
  }
}
