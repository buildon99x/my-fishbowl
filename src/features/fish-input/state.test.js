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
    expect(state.isExpanded).toBe(false);
  });

  it('returns preview state when draft with spriteDataUrl exists', () => {
    mockStorage.setItem(FISH_DRAFT_STORAGE_KEY, JSON.stringify({
      name: 'Nemo',
      spriteDataUrl: 'data:image/png;base64,abc',
      source: 'upload',
    }));
    const state = createFishInputState();
    expect(state.status).toBe('preview');
    expect(state.name).toBe('Nemo');
  });
});

describe('saveFishDraft', () => {
  it('saves draft to localStorage and returns it', () => {
    const state = { name: '  Dory  ', spriteDataUrl: 'data:image/png;base64,xyz', source: 'draw' };
    const draft = saveFishDraft(state);
    expect(draft.name).toBe('Dory');
    expect(draft.source).toBe('draw');
    expect(draft.createdAt).toBeDefined();

    const stored = JSON.parse(mockStorage.getItem(FISH_DRAFT_STORAGE_KEY));
    expect(stored.name).toBe('Dory');
  });
});
