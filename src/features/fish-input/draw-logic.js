// Pure, canvas-free helpers for the drawing canvas. Extracted so the decision
// logic (tap-vs-drag, undo/redo stack transitions, register-gating, content
// tracking) is unit-testable in Node without a DOM/canvas.

const MAX_HISTORY = 20;

/** Midpoint between two points — used for quadratic-curve stroke smoothing. */
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Parse a CSS color string (#rgb, #rrggbb, or rgb()/rgba()) to an [r,g,b]
 * integer triple. Returns null for unrecognized input so callers can fall back.
 */
export function parseColorToRgb(color) {
  if (typeof color !== 'string') return null;
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}

/**
 * Flood-fill a contiguous same-color region with `fillRGBA`, in place, over a
 * raw RGBA pixel buffer (canvas-free so it is Node-testable). The seed pixel's
 * RGBA is the match target; a neighbour joins the region when the per-channel
 * absolute difference summed over R,G,B AND A is within `tolerance`. Including
 * alpha is essential: it keeps a transparent-background fill (0,0,0,0) from
 * leaking into opaque near-black ink (e.g. 10,10,10,255).
 *
 * No-ops when the seed already equals `fillRGBA` (prevents a pointless full
 * repaint and the visual "nothing happened / it ate my drawing" bug).
 *
 * @param {Uint8ClampedArray|number[]} data - RGBA buffer, length width*height*4
 * @param {number} width
 * @param {number} height
 * @param {number} startX
 * @param {number} startY
 * @param {{ tolerance?: number, fillRGBA: [number,number,number,number] }} opts
 * @returns {number} count of pixels filled
 */
export function floodFillPixels(data, width, height, startX, startY, opts) {
  const { tolerance = 30, fillRGBA } = opts;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return 0;

  const idx = (startY * width + startX) * 4;
  const tR = data[idx];
  const tG = data[idx + 1];
  const tB = data[idx + 2];
  const tA = data[idx + 3];

  const [fR, fG, fB, fA] = fillRGBA;
  // Seed already the fill color → nothing to do (avoids infinite-looking repaint).
  if (tR === fR && tG === fG && tB === fB && tA === fA) return 0;

  const queue = [[startX, startY]];
  let head = 0;
  const visited = new Uint8Array(width * height);
  let filled = 0;

  while (head < queue.length) {
    const [x, y] = queue[head++];
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = y * width + x;
    if (visited[i]) continue;
    visited[i] = 1;

    const pi = i * 4;
    const dr = Math.abs(data[pi] - tR);
    const dg = Math.abs(data[pi + 1] - tG);
    const db = Math.abs(data[pi + 2] - tB);
    const da = Math.abs(data[pi + 3] - tA);
    if (dr + dg + db + da > tolerance) continue;

    data[pi] = fR;
    data[pi + 1] = fG;
    data[pi + 2] = fB;
    data[pi + 3] = fA;
    filled += 1;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return filled;
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
