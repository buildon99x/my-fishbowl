export const FISH_DRAFT_STORAGE_KEY = 'my-fishbowl:fish-draft';
export const DEFAULT_FISH_NAME = 'Unnamed fish';

export function createFishInputState() {
  const draft = loadFishDraft();

  return {
    name: draft?.name ?? '',
    spriteDataUrl: draft?.spriteDataUrl ?? '',
    status: draft?.spriteDataUrl ? 'preview' : 'idle',
    message: draft?.spriteDataUrl ? 'Saved fish image is ready.' : '',
    source: draft?.source ?? '',
    isExpanded: false,
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
