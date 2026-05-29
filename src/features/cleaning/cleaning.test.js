import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  bindCleaningEvents,
  createCleaningState,
  calculateCleaningProgress,
} from './index.js';

// The project runs tests in the `node` environment (see vite.config.js), so we
// build a tiny EventTarget-based fake DOM instead of pulling in jsdom. The goal
// is to verify the unified Pointer Events wiring (one path for mouse, touch and
// pen) drives brushing/cursor state correctly. Pixel math is covered separately
// by calculateCleaningProgress.

function makeFakeContext() {
  return {
    globalCompositeOperation: 'source-over',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    // All-opaque pixels keep progress well below the 0.8 completion threshold
    // so no auto-complete fires mid-assertion.
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100 * 100 * 4).fill(255) })),
  };
}

class FakeEl extends EventTarget {
  constructor() {
    super();
    this.style = {};
    this.classList = { add() {}, remove() {}, contains: () => false };
    this.children = [];
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
  setPointerCapture() {
    this.captured = true;
  }
  releasePointerCapture() {
    this.captured = false;
  }
  hasPointerCapture() {
    return Boolean(this.captured);
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

class FakeCanvas extends FakeEl {
  constructor() {
    super();
    this.width = 100;
    this.height = 100;
    this.ctx = makeFakeContext();
  }
  getContext() {
    return this.ctx;
  }
}

function pointer(type, { x = 10, y = 10, pointerId = 1, pointerType = 'mouse' } = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerId, pointerType });
  return event;
}

function buildHarness() {
  const overlay = new FakeEl();
  const cursor = new FakeEl();
  const canvas = new FakeCanvas();

  const map = {
    '[data-cleaning-exit]': null,
    '[data-cleaning-overlay]': overlay,
    '[data-algae-canvas]': canvas,
    '[data-cleaning-cursor]': cursor,
    '[data-cleaning-progress-fill]': null,
    '[data-cleaning-progress-label]': null,
    '[data-cleaning-progress-bar]': null,
  };
  const root = { querySelector: (sel) => (sel in map ? map[sel] : null) };

  const cleaningState = createCleaningState();
  cleaningState.cleaningMode = true;
  // Pretend there is algae to clean so brushing does not instantly complete.
  cleaningState.initialAlgaePixels = 1000;

  const appState = { cleaningState };
  bindCleaningEvents(root, { fishes: [] }, appState, { render: vi.fn(), save: vi.fn() });

  return { overlay, ctx: canvas.ctx, cleaningState };
}

describe('cleaning brush — unified pointer events', () => {
  beforeEach(() => {
    // addTouchRipple uses document.createElement; provide a minimal stub.
    globalThis.document = {
      createElement: () => {
        const el = new FakeEl();
        el.className = '';
        el.remove = () => {};
        return el;
      },
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  it.each(['mouse', 'touch', 'pen'])(
    'brushes on pointerdown, keeps brushing while down, stops on pointerup (%s)',
    (pointerType) => {
      const { overlay, ctx, cleaningState } = buildHarness();

      overlay.dispatchEvent(pointer('pointerdown', { pointerType }));
      expect(cleaningState.cleaning).toBe(true);
      const afterDown = ctx.arc.mock.calls.length;
      expect(afterDown).toBeGreaterThan(0); // brushed once on press

      overlay.dispatchEvent(pointer('pointermove', { x: 20, y: 20, pointerType }));
      expect(ctx.arc.mock.calls.length).toBeGreaterThan(afterDown); // brushed while down

      overlay.dispatchEvent(pointer('pointerup', { pointerType }));
      expect(cleaningState.cleaning).toBe(false);

      const afterUp = ctx.arc.mock.calls.length;
      overlay.dispatchEvent(pointer('pointermove', { x: 30, y: 30, pointerType }));
      expect(ctx.arc.mock.calls.length).toBe(afterUp); // no brushing after release
    },
  );

  it('pointermove without a prior pointerdown does not brush', () => {
    const { overlay, ctx, cleaningState } = buildHarness();
    overlay.dispatchEvent(pointer('pointermove', { x: 15, y: 15 }));
    expect(cleaningState.cleaning).toBe(false);
    expect(ctx.arc.mock.calls.length).toBe(0);
  });

  it('pointercancel ends the stroke', () => {
    const { overlay, cleaningState } = buildHarness();
    overlay.dispatchEvent(pointer('pointerdown'));
    expect(cleaningState.cleaning).toBe(true);
    overlay.dispatchEvent(pointer('pointercancel'));
    expect(cleaningState.cleaning).toBe(false);
  });

  it('keeps an active captured stroke alive when the pointer leaves the overlay', () => {
    const { overlay, ctx, cleaningState } = buildHarness();
    overlay.dispatchEvent(pointer('pointerdown')); // captures the pointer
    expect(cleaningState.cleaning).toBe(true);

    // Pointer crosses the bowl edge mid-drag: capture still routes events here.
    overlay.dispatchEvent(pointer('pointerleave'));
    expect(cleaningState.cleaning).toBe(true);

    const afterLeave = ctx.arc.mock.calls.length;
    overlay.dispatchEvent(pointer('pointermove', { x: 25, y: 25 }));
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(afterLeave); // still brushing
  });

  it('hides the cursor and ends cleaning when an un-pressed pointer leaves', () => {
    const { overlay, cleaningState } = buildHarness();
    // Hover in, then leave without pressing — nothing is captured.
    overlay.dispatchEvent(pointer('pointerenter'));
    overlay.dispatchEvent(pointer('pointerleave'));
    expect(cleaningState.cleaning).toBe(false);
  });
});

describe('calculateCleaningProgress', () => {
  it('returns 1 when there was no algae to begin with', () => {
    expect(calculateCleaningProgress(0, { data: new Uint8ClampedArray(4).fill(255) })).toBe(1);
  });

  it('reports partial progress as visible pixels shrink', () => {
    // 4 pixels, all initially opaque (4 visible). Clear 2 → 0.5 progress.
    const data = new Uint8ClampedArray(4 * 4).fill(255);
    data[3] = 0;
    data[7] = 0;
    expect(calculateCleaningProgress(4, { data })).toBe(0.5);
  });
});
