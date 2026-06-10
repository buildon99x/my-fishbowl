import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFishInputState, saveFishDraft, FISH_DRAFT_STORAGE_KEY } from './state.js';

const mockStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', mockStorage);

beforeEach(() => {
  mockStorage.clear();
});

describe('createFishInputState', () => {
  it('returns idle state when no draft exists', () => {
    const state = createFishInputState();
    expect(state.status).toBe('idle');
    expect(state.name).toBe('');
    expect(state.spriteDataUrl).toBe('');
    expect(state.movementEnabled).toBe(true);
    expect(state.isExpanded).toBe(false);
  });

  it('returns preview state when draft with spriteDataUrl exists', () => {
    mockStorage.setItem(FISH_DRAFT_STORAGE_KEY, JSON.stringify({
      name: 'Nemo',
      spriteDataUrl: 'data:image/png;base64,abc',
      source: 'upload',
      movementEnabled: false,
    }));
    const state = createFishInputState();
    expect(state.status).toBe('preview');
    expect(state.name).toBe('Nemo');
    expect(state.movementEnabled).toBe(false);
  });

  it('initializes empty undo/redo history that survives re-renders', () => {
    const state = createFishInputState();
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
  });

  it('marks hasContent when a drawn draft is restored, blank otherwise', () => {
    expect(createFishInputState().hasContent).toBe(false);
    mockStorage.setItem(FISH_DRAFT_STORAGE_KEY, JSON.stringify({
      spriteDataUrl: 'data:image/png;base64,abc', source: 'drawing',
    }));
    expect(createFishInputState().hasContent).toBe(true);
  });
});

describe('saveFishDraft does not persist runtime history', () => {
  it('omits undo/redo stacks and hasContent from the stored draft', () => {
    const state = {
      name: 'Dot', spriteDataUrl: 'data:image/png;base64,xyz', source: 'drawing',
      movementEnabled: true, hasContent: true, undoStack: [1, 2], redoStack: [3],
    };
    saveFishDraft(state);
    const stored = JSON.parse(mockStorage.getItem(FISH_DRAFT_STORAGE_KEY));
    expect(stored.undoStack).toBeUndefined();
    expect(stored.redoStack).toBeUndefined();
    expect(stored.hasContent).toBeUndefined();
  });
});

describe('saveFishDraft', () => {
  it('saves draft to localStorage and returns it', () => {
    const state = { name: '  Dory  ', spriteDataUrl: 'data:image/png;base64,xyz', source: 'draw', movementEnabled: false };
    const draft = saveFishDraft(state);
    expect(draft.name).toBe('Dory');
    expect(draft.source).toBe('draw');
    expect(draft.movementEnabled).toBe(false);
    expect(draft.createdAt).toBeDefined();

    const stored = JSON.parse(mockStorage.getItem(FISH_DRAFT_STORAGE_KEY));
    expect(stored.name).toBe('Dory');
  });
});
