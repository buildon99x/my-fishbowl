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

  it('includes sand, seaweed, and eel sources by id', () => {
    const state = createBubblesState();
    const ids = state.sources.map((s) => s.id);

    expect(ids).toContain('sand');
    expect(ids).toContain('seaweed-left');
    expect(ids).toContain('seaweed-right');
    expect(ids).toContain('eel-one');
    expect(ids).toContain('eel-two');
  });

  it('initializes pauseUntilMs as 0 (not paused)', () => {
    const state = createBubblesState();

    expect(state.pauseUntilMs).toBe(0);
  });

  it('schedules first pause at least 20 s after startup', () => {
    const state = createBubblesState();

    // performance.now() is mocked to 0, so nextPauseAt >= 20000
    expect(state.nextPauseAt).toBeGreaterThanOrEqual(20000);
  });
});

describe('tickBubbles — emission', () => {
  it('initializes lastTickAt on first tick', () => {
    const state = createBubblesState();

    expect(state.lastTickAt).toBe(0);
    tickBubbles(state, 1000);
    expect(state.lastTickAt).toBe(1000);
  });

  it('emits a bubble when a source timer expires', () => {
    const state = createBubblesState();

    for (const source of state.sources) {
      source.nextEmitAt = 0;
    }

    tickBubbles(state, 1000);

    expect(state.bubbles.length).toBe(5);
  });

  it('reschedules source nextEmitAt after emission', () => {
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

  it('does not emit bubbles before source timer expires', () => {
    const state = createBubblesState();

    tickBubbles(state, 1);

    expect(state.bubbles).toHaveLength(0);
  });
});

describe('tickBubbles — bubble lifecycle', () => {
  it('removes bubbles that reach the water surface', () => {
    const state = createBubblesState();

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
});

describe('tickBubbles — pause mechanism', () => {
  it('does not emit while pause is active', () => {
    const state = createBubblesState();

    // Force all sources due now, then set active pause
    for (const source of state.sources) {
      source.nextEmitAt = 0;
    }
    state.pauseUntilMs = 5000; // paused until 5 s

    tickBubbles(state, 1000); // still within pause

    expect(state.bubbles).toHaveLength(0);
  });

  it('resumes emission after pause ends', () => {
    const state = createBubblesState();

    for (const source of state.sources) {
      source.nextEmitAt = 0;
    }
    state.pauseUntilMs = 500; // pause ended before nowMs

    tickBubbles(state, 1000);

    expect(state.bubbles.length).toBeGreaterThan(0);
  });

  it('starts a pause when nextPauseAt is reached', () => {
    const state = createBubblesState();

    state.nextPauseAt = 1000;

    tickBubbles(state, 1000);

    expect(state.pauseUntilMs).toBeGreaterThan(1000);
  });

  it('pause duration is between 2 and 5 seconds', () => {
    const state = createBubblesState();

    state.nextPauseAt = 1000;
    tickBubbles(state, 1000);

    const duration = state.pauseUntilMs - 1000;

    expect(duration).toBeGreaterThanOrEqual(2000);
    expect(duration).toBeLessThanOrEqual(5000);
  });

  it('schedules next pause at least 15 s after current pause ends', () => {
    const state = createBubblesState();

    state.nextPauseAt = 1000;
    tickBubbles(state, 1000);

    expect(state.nextPauseAt).toBeGreaterThanOrEqual(state.pauseUntilMs + 15000);
  });

  it('does not start a second pause while one is active', () => {
    const state = createBubblesState();

    state.nextPauseAt = 0;
    state.pauseUntilMs = 5000; // already paused until 5 s

    tickBubbles(state, 1000); // still paused

    // pauseUntilMs must not have been overwritten
    expect(state.pauseUntilMs).toBe(5000);
  });

  it('defers source timers that fall inside the pause window', () => {
    const state = createBubblesState();

    // All sources are due now
    for (const source of state.sources) {
      source.nextEmitAt = 500;
    }
    state.nextPauseAt = 1000;

    tickBubbles(state, 1000); // pause starts now, pauseUntilMs ≥ 3000

    for (const source of state.sources) {
      expect(source.nextEmitAt).toBeGreaterThanOrEqual(state.pauseUntilMs);
    }
  });
});
