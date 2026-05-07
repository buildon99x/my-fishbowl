import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFishToAquarium,
  createFishFromDraft,
  deleteFishFromAquarium,
  getFishById,
  toggleFishHidden,
  updateFishAppearance,
} from './fish-actions.js';

let storage;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  });
  let counter = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++counter}` });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeAquarium(fishes = []) {
  return {
    id: 'aq-1',
    name: 'test',
    fishes,
    cleanliness: 100,
    algaeLevel: 0,
    bounds: {},
    lastCleanedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('createFishFromDraft', () => {
  it('returns a fish with required defaults', () => {
    const fish = createFishFromDraft({ name: 'nemo', spriteDataUrl: 'data:x' }, 0);
    expect(fish.name).toBe('nemo');
    expect(fish.imageUrl).toBe('data:x');
    expect(fish.hidden).toBe(false);
    expect(fish.movementEnabled).toBe(true);
    expect(fish.movementStatus).toBe('cruising');
    expect(fish.size).toBe(120);
    expect(typeof fish.id).toBe('string');
  });

  it('honors movementEnabled: false from draft', () => {
    const fish = createFishFromDraft({ name: 'a', spriteDataUrl: 'x', movementEnabled: false }, 0);
    expect(fish.movementEnabled).toBe(false);
  });
});

describe('addFishToAquarium', () => {
  it('appends a fish, bumps updatedAt, and persists', () => {
    const aq = makeAquarium();
    const before = aq.updatedAt;
    const fish = addFishToAquarium(aq, { name: 'a', spriteDataUrl: 'x' });
    expect(aq.fishes).toHaveLength(1);
    expect(aq.fishes[0]).toBe(fish);
    expect(aq.updatedAt).not.toBe(before);
    expect(storage.get('my-fishbowl:aquarium')).toContain('"id":"id-1"');
  });
});

describe('deleteFishFromAquarium', () => {
  it('removes the matching fish and persists', () => {
    const aq = makeAquarium([{ id: 'a' }, { id: 'b' }]);
    deleteFishFromAquarium(aq, 'a');
    expect(aq.fishes).toEqual([{ id: 'b' }]);
    expect(storage.has('my-fishbowl:aquarium')).toBe(true);
  });

  it('is a no-op when id does not match', () => {
    const aq = makeAquarium([{ id: 'a' }]);
    deleteFishFromAquarium(aq, 'missing');
    expect(aq.fishes).toEqual([{ id: 'a' }]);
  });
});

describe('toggleFishHidden', () => {
  it('flips hidden on the matching fish only', () => {
    const aq = makeAquarium([
      { id: 'a', hidden: false },
      { id: 'b', hidden: true },
    ]);
    toggleFishHidden(aq, 'a');
    expect(aq.fishes[0].hidden).toBe(true);
    expect(aq.fishes[1].hidden).toBe(true);
  });
});

describe('updateFishAppearance', () => {
  it('merges patch onto the matching fish without touching siblings', () => {
    const aq = makeAquarium([
      { id: 'a', size: 10, name: 'old' },
      { id: 'b', size: 20 },
    ]);
    updateFishAppearance(aq, 'a', { size: 99, name: 'new' });
    expect(aq.fishes[0]).toEqual({ id: 'a', size: 99, name: 'new' });
    expect(aq.fishes[1]).toEqual({ id: 'b', size: 20 });
  });
});

describe('getFishById', () => {
  it('returns the matching fish', () => {
    const aq = makeAquarium([{ id: 'a' }, { id: 'b' }]);
    expect(getFishById(aq, 'b')).toBe(aq.fishes[1]);
  });

  it('returns undefined when missing', () => {
    expect(getFishById(makeAquarium(), 'x')).toBeUndefined();
  });
});
