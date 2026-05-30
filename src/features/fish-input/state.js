export const FISH_DRAFT_STORAGE_KEY = 'my-fishbowl:fish-draft';
export const DEFAULT_FISH_NAME = '이름 없는 친구';

function normalizeType(value) {
  return value === 'deco' ? 'deco' : 'fish';
}

export function createFishInputState() {
  const draft = loadFishDraft();

  return {
    name: draft?.name ?? '',
    spriteDataUrl: draft?.spriteDataUrl ?? '',
    status: draft?.spriteDataUrl ? 'preview' : 'idle',
    message: draft?.spriteDataUrl ? '저장된 이미지를 불러왔어요.' : '',
    source: draft?.source ?? '',
    type: normalizeType(draft?.type),
    movementEnabled: draft?.movementEnabled !== false,
    // A restored draft already holds drawn/uploaded content, so register is allowed.
    hasContent: Boolean(draft?.spriteDataUrl),
    isExpanded: false,
    sheetStage: 'closed',
    activeTab: 'catalog',
  };
}

function loadFishDraft() {
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
  const type = normalizeType(state.type);
  const draft = {
    name: state.name.trim() || DEFAULT_FISH_NAME,
    spriteDataUrl: state.spriteDataUrl,
    source: state.source,
    type,
    movementEnabled: type === 'deco' ? false : state.movementEnabled !== false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    localStorage.setItem(FISH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Fish image draft could not be saved.', error);
    // Surface storage pressure to the caller so the UI can warn the child that
    // their work may not have been saved, instead of failing silently.
    draft.storageError = true;
  }

  return draft;
}
