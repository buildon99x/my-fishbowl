import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addUserPropToAquarium,
  commitPendingDelete,
  createFishFromDraft,
  deleteFishFromAquarium,
  getFishById,
  restoreProp,
  softDeleteProp,
  toggleFishHidden,
  updateFishAppearance,
  updatePropType,
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

describe('addUserPropToAquarium', () => {
  it('appends a fish, bumps updatedAt, and persists', () => {
    const aq = makeAquarium();
    const before = aq.updatedAt;
    const fish = addUserPropToAquarium(aq, { name: 'a', spriteDataUrl: 'x' });
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

describe('createFishFromDraft (prop type)', () => {
  it("defaults type to 'fish' when draft has no type", () => {
    const fish = createFishFromDraft({ name: 'a', spriteDataUrl: 'x' }, 0);
    expect(fish.type).toBe('fish');
    expect(fish.movementEnabled).toBe(true);
  });

  it("creates a deco prop with deco defaults when type='deco'", () => {
    const deco = createFishFromDraft({ name: 'rock', spriteDataUrl: 'x', type: 'deco' }, 0);
    expect(deco.type).toBe('deco');
    expect(deco.movementEnabled).toBe(false);
    expect(deco.size).toBe(110);
    expect(deco.x).toBeCloseTo(50, 5);
    expect(deco.y).toBeCloseTo(78, 5);
  });
});

describe('updatePropType', () => {
  it("transitions fish to deco preserving appearance and forcing movementEnabled=false", () => {
    const aq = makeAquarium([{ id: 'a', type: 'fish', x: 30, y: 40, size: 120, movementEnabled: true, hunger: 5 }]);
    const changed = updatePropType(aq, 'a', 'deco');
    expect(changed).toBe(true);
    expect(aq.fishes[0].type).toBe('deco');
    expect(aq.fishes[0].x).toBe(30);
    expect(aq.fishes[0].y).toBe(40);
    expect(aq.fishes[0].size).toBe(120);
    expect(aq.fishes[0].hunger).toBe(5);
    expect(aq.fishes[0].movementEnabled).toBe(false);
  });

  it("transitions deco to fish defaulting movementEnabled to true when no prior preference is recorded", () => {
    const aq = makeAquarium([{ id: 'a', type: 'deco', x: 50, y: 78, size: 110, movementEnabled: false }]);
    const changed = updatePropType(aq, 'a', 'fish');
    expect(changed).toBe(true);
    expect(aq.fishes[0].type).toBe('fish');
    expect(aq.fishes[0].movementEnabled).toBe(true);
  });

  it("round-trips fish->deco->fish preserving the user's prior movementEnabled=false preference", () => {
    const aq = makeAquarium([{ id: 'a', type: 'fish', movementEnabled: false }]);
    updatePropType(aq, 'a', 'deco');
    expect(aq.fishes[0].movementEnabled).toBe(false);
    updatePropType(aq, 'a', 'fish');
    expect(aq.fishes[0].type).toBe('fish');
    expect(aq.fishes[0].movementEnabled).toBe(false);
  });

  it("round-trips fish->deco->fish defaulting movementEnabled=true when prior was true", () => {
    const aq = makeAquarium([{ id: 'a', type: 'fish', movementEnabled: true }]);
    updatePropType(aq, 'a', 'deco');
    updatePropType(aq, 'a', 'fish');
    expect(aq.fishes[0].movementEnabled).toBe(true);
  });

  it("is a no-op when target type matches current type", () => {
    const aq = makeAquarium([{ id: 'a', type: 'fish' }]);
    expect(updatePropType(aq, 'a', 'fish')).toBe(false);
  });
});

describe('soft delete + undo', () => {
  it("softDeleteProp marks pendingDelete and pendingDeleteAt", () => {
    const aq = makeAquarium([{ id: 'a' }]);
    softDeleteProp(aq, 'a');
    expect(aq.fishes[0].pendingDelete).toBe(true);
    expect(typeof aq.fishes[0].pendingDeleteAt).toBe('string');
  });

  it("restoreProp clears pendingDelete", () => {
    const aq = makeAquarium([{ id: 'a', pendingDelete: true, pendingDeleteAt: 'now' }]);
    restoreProp(aq, 'a');
    expect(aq.fishes[0].pendingDelete).toBe(false);
    expect(aq.fishes[0].pendingDeleteAt).toBeNull();
  });

  it("commitPendingDelete removes only when pendingDelete is true", () => {
    const aq = makeAquarium([{ id: 'a', pendingDelete: true }, { id: 'b' }]);
    commitPendingDelete(aq, 'a');
    commitPendingDelete(aq, 'b');
    expect(aq.fishes.map((f) => f.id)).toEqual(['b']);
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
