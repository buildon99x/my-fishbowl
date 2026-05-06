import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFeedingState,
  createFoodAt,
  createFoodsAt,
  tickFeeding,
} from './state.js';

vi.stubGlobal('crypto', {
  randomUUID: () => 'food-1',
});

const BASE_NOW_MS = new Date('2026-05-06T00:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-06T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('feeding state', () => {
  it('creates pellet food at a water position', () => {
    const food = createFoodAt(32, 18, 'pellet');

    expect(food).toMatchObject({
      id: 'food-1',
      type: 'pellet',
      x: 32,
      y: 18,
      baseX: 32,
      landedAt: null,
      createdAt: BASE_NOW_MS,
    });
    expect(food.fallSpeed).toBeGreaterThanOrEqual(8);
    expect(food.fallSpeed).toBeLessThanOrEqual(12);
  });

  it('creates correct number of flake pieces per click', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('food-x') });
    const foods = createFoodsAt(50, 10, 'flake');
    expect(foods.length).toBeGreaterThanOrEqual(3);
    expect(foods.length).toBeLessThanOrEqual(5);
    foods.forEach((f) => expect(f.type).toBe('flake'));
  });

  it('creates exactly 1 bloodworm per click', () => {
    const foods = createFoodsAt(50, 10, 'bloodworm');
    expect(foods).toHaveLength(1);
    expect(foods[0].type).toBe('bloodworm');
    expect(foods[0].rotationSpeed).toBeGreaterThan(0);
  });

  it('creates 1~2 pellets per click', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('food-x') });
    const results = Array.from({ length: 20 }, () => createFoodsAt(50, 10, 'pellet').length);
    expect(Math.min(...results)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...results)).toBeLessThanOrEqual(2);
  });

  it('moves nearby fish toward food and reduces hunger by pellet amount when eaten', () => {
    const state = createFeedingState();
    state.foods = [{
      ...createFoodAt(50, 50, 'pellet'),
      y: 50,
      fallSpeed: 0,
      landedAt: null,
    }];
    state.lastTickAt = BASE_NOW_MS;

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
      BASE_NOW_MS + 1000,
    );

    expect(result.didEat).toBe(true);
    expect(state.foods).toHaveLength(0);
    expect(state.fishEating).toBe('fish-1');
    expect(result.fishes[0].hunger).toBe(21); // 36 - 15 (pellet)
    expect(result.fishes[0].flipped).toBe(false);
  });

  it('applies bloodworm special effects to eating fish', () => {
    const state = createFeedingState();
    const nowMs = BASE_NOW_MS + 1000;
    state.foods = [{
      ...createFoodAt(50, 50, 'bloodworm'),
      y: 50,
      fallSpeed: 0,
      landedAt: null,
    }];
    state.lastTickAt = BASE_NOW_MS;

    const result = tickFeeding(
      state,
      [{
        id: 'fish-1',
        x: 49,
        y: 50,
        hunger: 50,
        hidden: false,
        flipped: false,
      }],
      nowMs,
    );

    const fish = result.fishes[0];
    expect(result.didEat).toBe(true);
    expect(fish.hunger).toBe(25); // 50 - 25 (bloodworm)
    expect(fish.foodDetectRadiusUntilMs).toBeGreaterThan(nowMs);
    expect(fish.dartBoostUntilMs).toBeGreaterThan(nowMs);
  });
});
