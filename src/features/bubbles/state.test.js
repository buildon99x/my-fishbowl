import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBubblesState, tickBubbles } from './state.js';

beforeEach(() => {
  vi.spyOn(globalThis, 'performance', 'get').mockReturnValue({ now: () => 0 });
});

describe('createBubblesState', () => {
  it('initializes with empty bubbles array', () => {
    const state = createBubblesState();

    expect(state.bubbles).toEqual([]);
  });

  it('initializes with five sources', () => {
    const state = createBubblesState();

    expect(state.sources).toHaveLength(5);
  });

  it('each source has a nextEmitAt in the future', () => {
    const state = createBubblesState();
    const now = performance.now();

    for (const source of state.sources) {
      expect(source.nextEmitAt).toBeGreaterThan(now);
    }
  });

  it('includes sand, seaweed, and eel sources', () => {
    const state = createBubblesState();
    const types = state.sources.map((s) => s.type);

    expect(types).toContain('sand');
    expect(types).toContain('seaweed');
    expect(types).toContain('eel');
  });
});

describe('tickBubbles', () => {
  it('initializes lastTickAt on first tick', () => {
    const state = createBubblesState();

    expect(state.lastTickAt).toBe(0);
    tickBubbles(state, 1000);
    expect(state.lastTickAt).toBe(1000);
  });

  it('emits a bubble when a source timer expires', () => {
    const state = createBubblesState();

    // Force all sources to emit immediately
    for (const source of state.sources) {
      source.nextEmitAt = 0;
    }

    tickBubbles(state, 1000);

    expect(state.bubbles.length).toBe(5);
  });

  it('rescheduled source nextEmitAt after emission', () => {
    const state = createBubblesState();
    const source = state.sources[0];

    source.nextEmitAt = 0;
    tickBubbles(state, 1000);

    expect(source.nextEmitAt).toBeGreaterThan(1000);
  });

  it('moves bubbles upward on each tick', () => {
    const state = createBubblesState();
    const source = state.sources[0];

    source.nextEmitAt = 0;
    tickBubbles(state, 1000);

    const startY = state.bubbles[0].y;

    tickBubbles(state, 2000);

    expect(state.bubbles[0].y).toBeLessThan(startY);
  });

  it('removes bubbles that reach the water surface', () => {
    const state = createBubblesState();

    // Manually inject a bubble near the top
    state.bubbles.push({
      id: 'test-bubble',
      x: 500,
      originX: 500,
      y: 160,
      sourceY: 650,
      radius: 6,
      riseSpeed: 100,
      driftPhase: 0,
      driftSpeed: 1,
      driftAmplitude: 5,
      opacity: 1,
    });

    state.lastTickAt = 1000;
    const { removed } = tickBubbles(state, 2000);

    expect(removed).toContain('test-bubble');
    expect(state.bubbles.find((b) => b.id === 'test-bubble')).toBeUndefined();
  });

  it('fades in bubble near its source', () => {
    const state = createBubblesState();

    state.bubbles.push({
      id: 'fade-in',
      x: 500,
      originX: 500,
      y: 645,
      sourceY: 650,
      radius: 5,
      riseSpeed: 0,
      driftPhase: 0,
      driftSpeed: 0,
      driftAmplitude: 0,
      opacity: 0,
    });

    state.lastTickAt = 0;
    tickBubbles(state, 0);

    expect(state.bubbles[0].opacity).toBeLessThan(1);
    expect(state.bubbles[0].opacity).toBeGreaterThan(0);
  });

  it('bubble reaches full opacity away from source and surface', () => {
    const state = createBubblesState();

    state.bubbles.push({
      id: 'full-opacity',
      x: 500,
      originX: 500,
      y: 400,
      sourceY: 650,
      radius: 5,
      riseSpeed: 0,
      driftPhase: 0,
      driftSpeed: 0,
      driftAmplitude: 0,
      opacity: 0,
    });

    state.lastTickAt = 0;
    tickBubbles(state, 0);

    expect(state.bubbles[0].opacity).toBe(1);
  });

  it('does not emit bubbles before source timer expires', () => {
    const state = createBubblesState();

    // All sources have future emit times (set in createBubblesState)
    tickBubbles(state, 1);

    expect(state.bubbles).toHaveLength(0);
  });
});
