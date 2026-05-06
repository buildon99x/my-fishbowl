export const FISH_DRAFT_STORAGE_KEY = 'my-fishbowl:fish-draft';
export const DEFAULT_FISH_NAME = 'Unnamed fish';

const POSITION_KEY = 'my-fishbowl:fish-input-pos';

function loadSavedPosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos.x === 'number' && typeof pos.y === 'number') {
      return {
        x: Math.max(0, Math.min(pos.x, window.innerWidth - 200)),
        y: Math.max(0, Math.min(pos.y, window.innerHeight - 80)),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveFishInputPosition(pos) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
    // storage unavailable
  }
}

export function createFishInputState() {
  const draft = loadFishDraft();

  return {
    name: draft?.name ?? '',
    spriteDataUrl: draft?.spriteDataUrl ?? '',
    status: draft?.spriteDataUrl ? 'preview' : 'idle',
    message: draft?.spriteDataUrl ? 'Saved fish image is ready.' : '',
    source: draft?.source ?? '',
    movementEnabled: draft?.movementEnabled !== false,
    isExpanded: false,
    position: loadSavedPosition(),
  };
}

export function loadFishDraft() {
  try {
    const savedDraft = localStorage.getItem(FISH_DRAFT_STORAGE_KEY);

    return savedDraft ? JSON.parse(savedDraft) : null;
  } catch (error) {
    console.warn('Fish image draft could not be loaded.', error);
    return null;
  }
}

export function saveFishDraft(state) {
  const now = new Date().toISOString();
  const draft = {
    name: state.name.trim() || DEFAULT_FISH_NAME,
    spriteDataUrl: state.spriteDataUrl,
    source: state.source,
    movementEnabled: state.movementEnabled !== false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    localStorage.setItem(FISH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Fish image draft could not be saved.', error);
  }

  return draft;
}
