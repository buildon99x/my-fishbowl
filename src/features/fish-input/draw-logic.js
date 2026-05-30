// Pure, canvas-free helpers for the drawing canvas. Extracted so the decision
// logic (tap-vs-drag, undo/redo stack transitions, register-gating, content
// tracking) is unit-testable in Node without a DOM/canvas.

const MAX_HISTORY = 20;

/** Midpoint between two points — used for quadratic-curve stroke smoothing. */
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Undo transition. Moves the latest undo snapshot into redo and returns the
 * snapshot the caller should paint back onto the canvas.
 * Snapshots are opaque tokens here (ImageData at runtime), so this is pure.
 * @returns {{ snapshot: T|null, undoStack: T[], redoStack: T[], undoDisabled: boolean, redoDisabled: boolean }}
 */
export function applyUndo(undoStack, redoStack, currentSnapshot) {
  if (undoStack.length === 0) {
    return {
      snapshot: null,
      undoStack,
      redoStack,
      undoDisabled: true,
      redoDisabled: redoStack.length === 0,
    };
  }
  const nextUndo = undoStack.slice(0, -1);
  const snapshot = undoStack[undoStack.length - 1];
  const nextRedo = capHistory([...redoStack, currentSnapshot]);
  return {
    snapshot,
    undoStack: nextUndo,
    redoStack: nextRedo,
    undoDisabled: nextUndo.length === 0,
    redoDisabled: nextRedo.length === 0,
  };
}

/**
 * Redo transition. Moves the latest redo snapshot back onto the undo stack and
 * returns the snapshot the caller should paint.
 */
export function applyRedo(undoStack, redoStack, currentSnapshot) {
  if (redoStack.length === 0) {
    return {
      snapshot: null,
      undoStack,
      redoStack,
      undoDisabled: undoStack.length === 0,
      redoDisabled: true,
    };
  }
  const nextRedo = redoStack.slice(0, -1);
  const snapshot = redoStack[redoStack.length - 1];
  const nextUndo = capHistory([...undoStack, currentSnapshot]);
  return {
    snapshot,
    undoStack: nextUndo,
    redoStack: nextRedo,
    undoDisabled: nextUndo.length === 0,
    redoDisabled: nextRedo.length === 0,
  };
}

/** Drop the oldest entries so a history stack never exceeds MAX_HISTORY. */
export function capHistory(stack, max = MAX_HISTORY) {
  return stack.length > max ? stack.slice(stack.length - max) : stack;
}

/**
 * Whether the register button should be enabled for the current state.
 * A blank 720x480 PNG is non-empty bytes, so spriteDataUrl truthiness alone is
 * insufficient for the drawing source — hasContent is the real signal.
 */
export function canRegister(state) {
  if (!state.spriteDataUrl) return false;
  if (state.status === 'invalid') return false;
  if (state.source === 'drawing') return Boolean(state.hasContent);
  return true;
}

export { MAX_HISTORY };
