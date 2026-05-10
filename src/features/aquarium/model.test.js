import { describe, expect, it } from 'vitest';
import { DEFAULT_BOUNDS, createAquarium, normalizeAquarium } from './model.js';

describe('createAquarium', () => {
  it('returns an aquarium with default fields', () => {
    const a = createAquarium();
    expect(a.fishes).toEqual([]);
    expect(a.cleanliness).toBe(100);
    expect(a.algaeLevel).toBe(0);
    expect(a.bounds).toEqual(DEFAULT_BOUNDS);
    expect(a.bounds).not.toBe(DEFAULT_BOUNDS);
    expect(typeof a.id).toBe('string');
    expect(a.createdAt).toBe(a.updatedAt);
  });
});

describe('normalizeAquarium', () => {
  it('fills missing fields from createAquarium fallback', () => {
    const out = normalizeAquarium({});
    expect(out.fishes).toEqual([]);
    expect(out.cleanliness).toBe(100);
    expect(out.bounds).toEqual(DEFAULT_BOUNDS);
  });

  it('merges custom bounds over defaults', () => {
    const out = normalizeAquarium({ bounds: { width: 2000 } });
    expect(out.bounds.width).toBe(2000);
    expect(out.bounds.height).toBe(DEFAULT_BOUNDS.height);
    expect(out.bounds.shape).toBe(DEFAULT_BOUNDS.shape);
  });

  it('coerces fish fields with sane fallbacks', () => {
    const out = normalizeAquarium({
      fishes: [{ id: 'f1', vx: 'bad', size: 'bad', flipped: 1, headDirection: 'left' }],
    });
    const fish = out.fishes[0];
    expect(fish.id).toBe('f1');
    expect(fish.vx).toBe(0);
    expect(fish.size).toBe(120);
    expect(fish.flipped).toBe(true);
    expect(fish.headDirection).toBe('left');
    expect(fish.movementStatus).toBe('cruising');
    expect(fish.movementEnabled).toBe(true);
  });

  it('falls back scaleX from legacy shapeScaleX field', () => {
    const out = normalizeAquarium({ fishes: [{ id: 'f1', shapeScaleX: 0.7 }] });
    expect(out.fishes[0].scaleX).toBe(0.7);
  });

  it("defaults missing type to 'fish'", () => {
    const out = normalizeAquarium({ fishes: [{ id: 'a' }] });
    expect(out.fishes[0].type).toBe('fish');
  });

  it("preserves explicit deco type and forces movementEnabled false", () => {
    const out = normalizeAquarium({ fishes: [{ id: 'a', type: 'deco', movementEnabled: true }] });
    expect(out.fishes[0].type).toBe('deco');
    expect(out.fishes[0].movementEnabled).toBe(false);
  });

  it('drops props with pendingDelete=true on load', () => {
    const out = normalizeAquarium({ fishes: [
      { id: 'a' },
      { id: 'b', pendingDelete: true },
    ] });
    expect(out.fishes.map((f) => f.id)).toEqual(['a']);
  });

  it('returns empty fishes when input fishes is not an array', () => {
    expect(normalizeAquarium({ fishes: null }).fishes).toEqual([]);
    expect(normalizeAquarium({ fishes: 'x' }).fishes).toEqual([]);
  });
});
