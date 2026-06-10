export const FISH_DRAFT_STORAGE_KEY = 'my-fishbowl:fish-draft';
export const COACHMARK_STORAGE_KEY = 'my-fishbowl:create-coachmark-seen';
export const DEFAULT_FISH_NAME = '이름 없는 친구';

// Whether the first-run drawing coach-mark has already been dismissed. Stored as
// a tiny one-time flag (separate from the draft) so the hint shows only once.
function loadCoachmarkSeen() {
  try {
    return localStorage.getItem(COACHMARK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markCoachmarkSeen() {
  try {
    localStorage.setItem(COACHMARK_STORAGE_KEY, '1');
  } catch {
    /* non-fatal: the hint simply reappears next session */
  }
}

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
    // Undo/redo history (ImageData snapshots). Held on state so it survives the
    // full-DOM re-render that fires on every stroke/sheet interaction; never
    // serialized (saveFishDraft only persists explicit fields).
    undoStack: [],
    redoStack: [],
    // Selected drawing tool/color/size. Like the history stacks, these live on
    // state so the user's selection survives the full-DOM re-render that fires
    // after every stroke (the canvas closure is rebuilt each render). Not
    // serialized — session UI state, not draft content.
    drawTool: 'pen',
    drawColor: '#1a1a1a',
    drawSize: 8,
    // Left-right symmetry toggle + selected stamp shape (S-036). Like the
    // tool/color/size above, these are session UI state held on `state` so they
    // survive the full-DOM re-render; never serialized by saveFishDraft.
    symmetry: false,
    drawShape: 'circle',
    isExpanded: false,
    sheetStage: 'closed',
    // First-run coach-mark: shown over the canvas until the child draws once.
    coachmarkSeen: loadCoachmarkSeen(),
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
