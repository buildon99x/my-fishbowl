import { createAquarium, normalizeAquarium } from './model.js';

const STORAGE_KEY = 'my-fishbowl:aquarium';

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

export function saveAquarium(aquarium) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aquarium));
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      console.warn('[fishbowl] 저장 공간이 부족해 수족관 데이터를 저장할 수 없어요.', error);
    } else {
      console.warn('[fishbowl] 수족관 데이터를 저장할 수 없어요.', error);
    }
  }
}
