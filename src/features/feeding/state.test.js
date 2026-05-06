import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFeedingState,
  createFoodAt,
  tickFeeding,
} from './state.js';

vi.stubGlobal('crypto', {
  randomUUID: () => 'food-1',
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-06T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('feeding state', () => {
  it('creates basic food at a water position', () => {
    const food = createFoodAt(32, 18);

    expect(food).toMatchObject({
      id: 'food-1',
      type: 'basic',
      x: 32,
      y: 18,
    });
    expect(food.fallSpeed).toBeGreaterThan(0);
    expect(food.createdAt).toBe('2026-05-06T00:00:00.000Z');
  });

  it('moves nearby fish toward food and reduces hunger when eaten', () => {
    const state = createFeedingState();
    state.foods = [{ ...createFoodAt(50, 50), y: 50, fallSpeed: 0 }];
    state.lastTickAt = 0;

    const result = tickFeeding(
      state,
      [{
        id: 'fish-1',
        x: 49,
        y: 50,
        hunger: 36,
        hidden: false,
        flipped: true,
      }],
      1000,
    );

    expect(result.didEat).toBe(true);
    expect(state.foods).toHaveLength(0);
    expect(state.fishEating).toBe('fish-1');
    expect(result.fishes[0].hunger).toBe(18);
    expect(result.fishes[0].flipped).toBe(false);
  });
});
