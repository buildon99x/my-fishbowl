import { describe, it, expect } from 'vitest';
import {
  MAX_HISTORY,
  applyRedo,
  applyUndo,
  canRegister,
  capHistory,
  midpoint,
} from './draw-logic.js';

describe('midpoint', () => {
  it('averages two points', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
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
