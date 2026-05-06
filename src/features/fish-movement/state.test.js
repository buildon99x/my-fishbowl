import { describe, expect, it } from 'vitest';
import {
  MOVEMENT_BOUNDS,
  normalizeFishMovement,
  shouldFlipFishForMovement,
  stepFishMovement,
  stepFishesMovement,
} from './state.js';

describe('normalizeFishMovement', () => {
  it('adds swimming movement state to a fish without motion values', () => {
    const fish = normalizeFishMovement({ id: 'fish-1', x: 50, y: 50 }, 0, 0, () => 0.5);

    expect(fish.movementStatus).toBe('cruising');
    expect(fish.behaviorStatus).toBe('cruising');
    expect(fish.speed).toBeGreaterThan(0);
    expect(fish.speedMultiplier).toBeGreaterThanOrEqual(0.7);
    expect(fish.idleBias).toBeGreaterThanOrEqual(0);
    expect(['top', 'middle', 'bottom']).toContain(fish.preferredDepth);
    expect(fish.wavingFrequency).toBeGreaterThanOrEqual(2);
    expect(fish.wavingAmplitude).toBeGreaterThanOrEqual(2);
    expect(fish.vx).toBeGreaterThan(0);
    expect(fish.headDirection).toBe('right');
    expect(fish.movementEnabled).toBe(true);
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
    expect(['cruising', 'turning']).toContain(fish.movementStatus);
    expect(fish.waveOffset).toBe(0);
    expect(fish.movementTilt).toBeGreaterThan(0);
  });

  it('pauses at a horizontal boundary and later resumes inward', () => {
    const fish = stepFishMovement(
      { id: 'fish-1', x: MOVEMENT_BOUNDS.maxX - 0.1, y: 50, vx: 6, vy: 0, speed: 6, nextTargetAtMs: 5000 },
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.x).toBe(MOVEMENT_BOUNDS.maxX);
    expect(fish.vx).toBe(0);
    expect(fish.movementStatus).toBe('idle');
    expect(fish.wallPauseUntilMs).toBe(3750);
    expect(fish.wallResumeVx).toBeLessThan(0);

    const resumedFish = stepFishMovement(
      fish,
      1000,
      5000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(resumedFish.vx).toBeLessThan(0);
    expect(resumedFish.wallPauseUntilMs).toBe(0);
  });

  it('keeps fish inside vertical bounds', () => {
    const fish = stepFishMovement(
      { id: 'fish-1', x: 50, y: MOVEMENT_BOUNDS.minY + 0.1, vx: 0, vy: -5, speed: 5, nextTargetAtMs: 5000 },
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.y).toBe(MOVEMENT_BOUNDS.minY);
    expect(fish.vy).toBe(0);
    expect(fish.wallResumeVy).toBeGreaterThan(0);
  });

  it('forces a dart away from the mouse and returns to cruising', () => {
    const dartingFish = stepFishMovement(
      {
        id: 'fish-1',
        x: 50,
        y: 50,
        vx: 4,
        vy: 0,
        speed: 4,
        speedMultiplier: 1,
        behaviorStatus: 'cruising',
        nextBehaviorAtMs: 5000,
      },
      16,
      1000,
      {
        random: () => 0.5,
        mouseState: { isInside: true, x: 48, y: 50, widthPx: 800, heightPx: 400 },
      },
    );

    expect(dartingFish.movementStatus).toBe('dart');
    expect(dartingFish.vx).toBeGreaterThan(0);
    expect(dartingFish.dartUntilMs).toBe(1800);

    const cruisingFish = stepFishMovement(
      {
        ...dartingFish,
        behaviorStatus: 'dart',
        movementStatus: 'dart',
      },
      900,
      1900,
      {
        random: () => 0.5,
        mouseState: { isInside: false, x: 0, y: 0, widthPx: 800, heightPx: 400 },
        maxFrameMs: 1000,
      },
    );

    expect(cruisingFish.behaviorStatus).toBe('cruising');
  });

  it('keeps a wander vector stable between target refreshes', () => {
    const fish = stepFishMovement(
      {
        id: 'fish-1',
        x: 50,
        y: 50,
        vx: 4,
        vy: 1,
        speed: 4,
        speedMultiplier: 1,
        behaviorStatus: 'wander',
        movementStatus: 'wander',
        nextTargetAtMs: 5000,
        nextBehaviorAtMs: 5000,
      },
      16,
      1000,
      { random: () => 0.1 },
    );

    expect(fish.vx).toBe(4);
    expect(fish.vy).toBe(1);
  });
});

describe('shouldFlipFishForMovement', () => {
  it('faces right-headed fish toward the movement direction', () => {
    expect(shouldFlipFishForMovement({ headDirection: 'right', vx: 4, flipped: false })).toBe(false);
    expect(shouldFlipFishForMovement({ headDirection: 'right', vx: -4, flipped: false })).toBe(true);
  });

  it('faces left-headed fish toward the movement direction', () => {
    expect(shouldFlipFishForMovement({ headDirection: 'left', vx: -4, flipped: false })).toBe(false);
    expect(shouldFlipFishForMovement({ headDirection: 'left', vx: 4, flipped: false })).toBe(true);
  });

  it('combines movement direction with manual flip correction', () => {
    expect(shouldFlipFishForMovement({ headDirection: 'right', vx: -4, flipped: true })).toBe(false);
  });
});

describe('stepFishesMovement', () => {
  it('returns an empty list without throwing when there are no fish', () => {
    expect(stepFishesMovement([], 16, 16)).toEqual([]);
  });

  it('does not move disabled fish', () => {
    const [fish] = stepFishesMovement(
      [{ id: 'fish-1', x: 50, y: 50, vx: 4, vy: 2, speed: 4, movementEnabled: false }],
      1000,
      1000,
      { random: () => 0.5, maxFrameMs: 1000 },
    );

    expect(fish.x).toBe(50);
    expect(fish.y).toBe(50);
  });
});
