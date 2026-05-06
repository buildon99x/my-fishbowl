import { describe, expect, it } from 'vitest';
import { MOVEMENT_BOUNDS, normalizeFishMovement, stepFishMovement, stepFishesMovement } from './state.js';

describe('normalizeFishMovement', () => {
  it('adds swimming movement state to a fish without motion values', () => {
    const fish = normalizeFishMovement({ id: 'fish-1', x: 50, y: 50 }, 0, 0, () => 0.5);

    expect(fish.movementStatus).toBe('swimming');
    expect(fish.speed).toBeGreaterThan(0);
    expect(fish.vx).toBeGreaterThan(0);
  });
});

describe('stepFishMovement', () => {
  it('moves a fish horizontally and vertically', () => {
    const fish = stepFishMovement(
      { id: 'fish-1', x: 50, y: 50, vx: 4, vy: 2, speed: 4, nextTargetAtMs: 5000 },
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.x).toBeGreaterThan(50);
    expect(fish.y).toBeGreaterThan(50);
    expect(fish.movementStatus).toBe('swimming');
  });

  it('reverses direction and flips image state at a horizontal boundary', () => {
    const fish = stepFishMovement(
      { id: 'fish-1', x: MOVEMENT_BOUNDS.maxX - 0.1, y: 50, vx: 6, vy: 0, speed: 6, nextTargetAtMs: 5000 },
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.x).toBe(MOVEMENT_BOUNDS.maxX);
    expect(fish.vx).toBeLessThan(0);
    expect(fish.flipped).toBe(true);
    expect(fish.movementStatus).toBe('turning');
  });

  it('keeps fish inside vertical bounds', () => {
    const fish = stepFishMovement(
      { id: 'fish-1', x: 50, y: MOVEMENT_BOUNDS.minY + 0.1, vx: 0, vy: -5, speed: 5, nextTargetAtMs: 5000 },
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.y).toBe(MOVEMENT_BOUNDS.minY);
    expect(fish.vy).toBeGreaterThan(0);
  });
});

describe('stepFishesMovement', () => {
  it('returns an empty list without throwing when there are no fish', () => {
    expect(stepFishesMovement([], 16, 16)).toEqual([]);
  });
});
