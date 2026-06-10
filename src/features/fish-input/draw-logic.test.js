import { describe, it, expect } from 'vitest';
import {
  MAX_HISTORY,
  STAMP_SHAPES,
  applyRedo,
  applyUndo,
  canRegister,
  capHistory,
  floodFillPixels,
  midpoint,
  mirrorX,
  normalizeShape,
  parseColorToRgb,
  shapePrimitives,
  stampSizeFor,
  statusFallbackKey,
} from './draw-logic.js';

describe('midpoint', () => {
  it('averages two points', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe('mirrorX (symmetry)', () => {
  it('reflects an x coordinate across the canvas centre', () => {
    expect(mirrorX(0, 720)).toBe(720);
    expect(mirrorX(720, 720)).toBe(0);
    expect(mirrorX(360, 720)).toBe(360); // centre maps to itself
    expect(mirrorX(200, 720)).toBe(520);
  });
});

describe('stampSizeFor', () => {
  it('scales the brush size by the pinned 3x factor (S-036)', () => {
    expect(stampSizeFor(8)).toBe(24);
    expect(stampSizeFor(14)).toBe(42);
    expect(stampSizeFor(22)).toBe(66);
  });
});

describe('normalizeShape', () => {
  it('keeps a known shape', () => {
    STAMP_SHAPES.forEach((shape) => expect(normalizeShape(shape)).toBe(shape));
  });
  it('falls back to circle for unknown/missing values', () => {
    expect(normalizeShape('banana')).toBe('circle');
    expect(normalizeShape(undefined)).toBe('circle');
    expect(normalizeShape(null)).toBe('circle');
  });
});

describe('shapePrimitives', () => {
  it('returns a single current-colour circle for circle', () => {
    const prims = shapePrimitives('circle', 30);
    expect(prims).toEqual([{ type: 'circle', cx: 0, cy: 0, r: 30, fill: 'current' }]);
  });

  it('returns a current-colour polygon for star/triangle/heart/drop', () => {
    ['star', 'triangle', 'heart', 'drop'].forEach((shape) => {
      const prims = shapePrimitives(shape, 30);
      expect(prims).toHaveLength(1);
      expect(prims[0].type).toBe('polygon');
      expect(prims[0].fill).toBe('current');
      expect(prims[0].points.length).toBeGreaterThanOrEqual(3);
      prims[0].points.forEach((p) => {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
      });
    });
  });

  it('star has 10 vertices (5 outer + 5 inner)', () => {
    expect(shapePrimitives('star', 20)[0].points).toHaveLength(10);
  });

  it('eye uses fixed white/dark fills so it reads as an eye regardless of pen colour', () => {
    const prims = shapePrimitives('eye', 30);
    expect(prims).toHaveLength(3);
    expect(prims.every((p) => p.type === 'circle')).toBe(true);
    expect(prims.some((p) => p.fill !== 'current')).toBe(true);
    expect(prims[0].fill).toBe('#ffffff');
    expect(prims[1].fill).toBe('#1a1a1a');
  });

  it('falls back to a circle for an unknown shape', () => {
    expect(shapePrimitives('banana', 30)[0].type).toBe('circle');
  });
});

describe('capHistory', () => {
  it('keeps stacks within MAX_HISTORY, dropping oldest', () => {
    const stack = Array.from({ length: MAX_HISTORY + 3 }, (_, i) => i);
    const capped = capHistory(stack);
    expect(capped).toHaveLength(MAX_HISTORY);
    expect(capped[0]).toBe(3); // oldest three dropped
    expect(capped.at(-1)).toBe(MAX_HISTORY + 2);
  });

  it('leaves short stacks untouched', () => {
    expect(capHistory([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('applyUndo', () => {
  it('moves the latest undo snapshot into redo and returns it', () => {
    const res = applyUndo(['a', 'b'], [], 'current');
    expect(res.snapshot).toBe('b');
    expect(res.undoStack).toEqual(['a']);
    expect(res.redoStack).toEqual(['current']);
    expect(res.undoDisabled).toBe(false);
    expect(res.redoDisabled).toBe(false);
  });

  it('reports disabled states when undo empties', () => {
    const res = applyUndo(['only'], [], 'current');
    expect(res.snapshot).toBe('only');
    expect(res.undoStack).toEqual([]);
    expect(res.undoDisabled).toBe(true);
  });

  it('is a no-op with an empty undo stack', () => {
    const res = applyUndo([], ['r'], 'current');
    expect(res.snapshot).toBeNull();
    expect(res.undoStack).toEqual([]);
    expect(res.redoStack).toEqual(['r']);
    expect(res.undoDisabled).toBe(true);
  });
});

describe('applyRedo', () => {
  it('moves the latest redo snapshot back onto undo and returns it', () => {
    const res = applyRedo(['a'], ['x'], 'current');
    expect(res.snapshot).toBe('x');
    expect(res.undoStack).toEqual(['a', 'current']);
    expect(res.redoStack).toEqual([]);
    expect(res.redoDisabled).toBe(true);
    expect(res.undoDisabled).toBe(false);
  });

  it('is a no-op with an empty redo stack', () => {
    const res = applyRedo(['a'], [], 'current');
    expect(res.snapshot).toBeNull();
    expect(res.redoDisabled).toBe(true);
  });
});

describe('undo/redo round trip', () => {
  it('restores the original stacks after undo then redo', () => {
    const undo0 = ['a', 'b'];
    const redo0 = [];
    const afterUndo = applyUndo(undo0, redo0, 'cur');
    // cur is the live canvas; redo now holds it, undo lost b.
    const afterRedo = applyRedo(afterUndo.undoStack, afterUndo.redoStack, afterUndo.snapshot);
    expect(afterRedo.snapshot).toBe('cur');
    expect(afterRedo.undoStack).toEqual(['a', 'b']);
    expect(afterRedo.redoStack).toEqual([]);
  });
});

describe('canRegister', () => {
  const base = { spriteDataUrl: 'data:image/png;base64,AAA', status: 'preview' };

  it('allows an uploaded sprite', () => {
    expect(canRegister({ ...base, source: 'upload' })).toBe(true);
  });

  it('allows a drawing only when it has content', () => {
    expect(canRegister({ ...base, source: 'drawing', hasContent: true })).toBe(true);
    expect(canRegister({ ...base, source: 'drawing', hasContent: false })).toBe(false);
  });

  it('blocks when there is no sprite', () => {
    expect(canRegister({ spriteDataUrl: '', status: 'idle', source: '' })).toBe(false);
  });

  it('blocks when the status is invalid', () => {
    expect(canRegister({ ...base, status: 'invalid', source: 'upload' })).toBe(false);
  });
});

describe('parseColorToRgb', () => {
  it('parses #rrggbb', () => {
    expect(parseColorToRgb('#0a0a0a')).toEqual([10, 10, 10]);
    expect(parseColorToRgb('#ff6b5a')).toEqual([255, 107, 90]);
  });

  it('parses shorthand #rgb', () => {
    expect(parseColorToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('parses rgb()/rgba()', () => {
    expect(parseColorToRgb('rgb(34, 197, 94)')).toEqual([34, 197, 94]);
    expect(parseColorToRgb('rgba(10,10,10,0.5)')).toEqual([10, 10, 10]);
  });

  it('returns null for unrecognized input', () => {
    expect(parseColorToRgb('teal')).toBeNull();
    expect(parseColorToRgb(undefined)).toBeNull();
  });
});

describe('floodFillPixels', () => {
  // Build a w*h RGBA buffer from an array of [r,g,b,a] pixels (row-major).
  function buf(pixels) {
    const data = new Uint8ClampedArray(pixels.length * 4);
    pixels.forEach((p, i) => {
      data[i * 4] = p[0];
      data[i * 4 + 1] = p[1];
      data[i * 4 + 2] = p[2];
      data[i * 4 + 3] = p[3];
    });
    return data;
  }
  const px = (data, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];

  it('fills a transparent background WITHOUT eating near-black ink (the bug)', () => {
    // 2x2: three transparent bg pixels + one black-ink pixel (10,10,10,255).
    const data = buf([
      [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [10, 10, 10, 255],
    ]);
    const filled = floodFillPixels(data, 2, 2, 0, 0, { fillRGBA: [255, 0, 0, 255] });
    expect(filled).toBe(3); // the 3 transparent pixels, not the ink
    expect(px(data, 0)).toEqual([255, 0, 0, 255]);
    expect(px(data, 3)).toEqual([10, 10, 10, 255]); // ink preserved
  });

  it('fills only the contiguous same-color region (bounded by a different color)', () => {
    // row: [white][black wall][white] — filling the left white must not cross.
    const data = buf([
      [255, 255, 255, 255], [0, 0, 0, 255], [255, 255, 255, 255],
    ]);
    const filled = floodFillPixels(data, 3, 1, 0, 0, { fillRGBA: [0, 128, 255, 255] });
    expect(filled).toBe(1);
    expect(px(data, 0)).toEqual([0, 128, 255, 255]);
    expect(px(data, 1)).toEqual([0, 0, 0, 255]); // wall untouched
    expect(px(data, 2)).toEqual([255, 255, 255, 255]); // right side untouched
  });

  it('is a no-op when the seed already equals the fill color', () => {
    const data = buf([[255, 0, 0, 255], [255, 0, 0, 255]]);
    const filled = floodFillPixels(data, 2, 1, 0, 0, { fillRGBA: [255, 0, 0, 255] });
    expect(filled).toBe(0);
  });

  it('respects out-of-range seeds', () => {
    const data = buf([[0, 0, 0, 0]]);
    expect(floodFillPixels(data, 1, 1, 5, 5, { fillRGBA: [1, 2, 3, 255] })).toBe(0);
  });
});

describe('statusFallbackKey', () => {
  it('maps preview and invalid to their own keys', () => {
    expect(statusFallbackKey('preview')).toBe('status.preview');
    expect(statusFallbackKey('invalid')).toBe('status.invalid');
  });

  it('falls back to idle for idle/unknown/empty', () => {
    expect(statusFallbackKey('idle')).toBe('status.idle');
    expect(statusFallbackKey('')).toBe('status.idle');
    expect(statusFallbackKey(undefined)).toBe('status.idle');
  });
});
