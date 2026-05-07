export const STORAGE_KEY = 'my-fishbowl:aquarium';

export function saveAquarium(aquarium) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aquarium));
  } catch (error) {
    console.warn('Aquarium data could not be saved.', error);
  }
}
