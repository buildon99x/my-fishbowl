import { DEFAULT_FISH_NAME, createFishInputState, saveFishDraft } from './state.js';
import { renderFishInputPanel } from './view.js';
import { loadImage, resizeImageToSprite } from '../../lib/spriteResize.js';
import { setLang, getCurrentLang, t } from '../../lib/i18n.js';
import { buildRegisterMessage } from './messages.js';
import {
  MAX_HISTORY,
  applyRedo,
  applyUndo,
  canRegister,
  capHistory,
  floodFillPixels,
  midpoint,
  parseColorToRgb,
} from './draw-logic.js';

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export { createFishInputState, renderFishInputPanel };

function updateState(state, patch, render) {
  Object.assign(state, patch);
  render();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function isSupportedImageFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return SUPPORTED_IMAGE_TYPES.has(file.type) || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

function paintStoredSprite(canvas, spriteDataUrl) {
  if (!spriteDataUrl) {
    return;
  }

  const context = canvas.getContext('2d');

  loadImage(spriteDataUrl)
    .then((image) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    })
    .catch(() => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    });
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

// Thin canvas wrapper around the pure floodFillPixels: fills the contiguous
// same-color region under the seed with `fillRgb` (the current pen color) at
// full opacity. Returns the number of pixels filled (0 = no-op).
function floodFill(ctx, canvas, startX, startY, fillRgb, tolerance = 30) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const filled = floodFillPixels(
    imageData.data,
    canvas.width,
    canvas.height,
    startX,
    startY,
    { tolerance, fillRGBA: [fillRgb[0], fillRgb[1], fillRgb[2], 255] },
  );
  if (filled > 0) ctx.putImageData(imageData, 0, 0);
  return filled;
}

function setupDrawingCanvas(root, state, render, playHaptic = () => {}) {
  const canvas = root.querySelector('[data-fish-canvas]');
  const clearButton = root.querySelector('[data-clear-drawing]');
  const undoButton = root.querySelector('[data-draw-undo]');
  const redoButton = root.querySelector('[data-draw-redo]');
  const toolButtons = root.querySelectorAll('[data-draw-tool]');

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  let isDrawing = false;
  let lastPoint = null;
  let lastMid = null;
  let currentTool = 'pen';

  // Undo/redo history lives on `state` so it survives the full-DOM re-render
  // that fires on every stroke and sheet interaction (the canvas node and this
  // closure are rebuilt each render; the history must not be).
  state.undoStack = state.undoStack ?? [];
  state.redoStack = state.redoStack ?? [];

  function snapshot() {
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function syncHistoryButtons() {
    if (undoButton) undoButton.disabled = state.undoStack.length === 0;
    if (redoButton) redoButton.disabled = state.redoStack.length === 0;
  }

  // Snapshot the canvas before a new mutation. Any fresh edit invalidates the
  // redo timeline, matching standard drawing-app behaviour.
  function pushUndo() {
    state.undoStack = capHistory([...state.undoStack, snapshot()], MAX_HISTORY);
    state.redoStack = [];
    state.hasContent = true;
    syncHistoryButtons();
  }

  let currentPresetSize = 8;
  const sizePresetBtns = root.querySelectorAll('[data-draw-size-preset]');

  function applyToolSettings() {
    const sizeControl = root.querySelector('.draw-size-control');
    if (currentTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = currentPresetSize;
      sizeControl?.classList.remove('is-inactive');
    } else if (currentTool === 'fill') {
      context.globalCompositeOperation = 'source-over';
      sizeControl?.classList.add('is-inactive');
    } else {
      context.globalCompositeOperation = 'source-over';
      context.lineWidth = currentPresetSize;
      sizeControl?.classList.remove('is-inactive');
    }
  }

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 8;
  context.strokeStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-ink')
      .trim() || '#0a0a0a';
  paintStoredSprite(canvas, state.spriteDataUrl);
  // Restore button-disabled state from the (re-render-surviving) history.
  syncHistoryButtons();

  toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTool = btn.dataset.drawTool;
      toolButtons.forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
        b.classList.remove('is-active');
      });
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('is-active');
      applyToolSettings();
      playHaptic('light');
    });
  });

  sizePresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPresetSize = Number(btn.dataset.drawSizePreset);
      if (currentTool !== 'fill') context.lineWidth = currentPresetSize;
      sizePresetBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      playHaptic('light');
    });
  });

  const colorBtns = root.querySelectorAll('[data-color]');
  colorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      context.strokeStyle = color;
      colorBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      playHaptic('light');
    });
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' && !event.isPrimary) return;

    const point = getCanvasPoint(canvas, event);

    if (currentTool === 'fill') {
      if (canvas.classList.contains('is-processing')) return;
      const fillRgb = parseColorToRgb(context.strokeStyle) ?? [10, 10, 10];
      pushUndo();
      canvas.classList.add('is-processing');
      canvas.style.cursor = 'wait';
      setTimeout(() => {
        const filled = floodFill(
          context,
          canvas,
          Math.round(point.x),
          Math.round(point.y),
          fillRgb,
        );
        canvas.classList.remove('is-processing');
        canvas.style.cursor = '';
        if (filled === 0) {
          // Seed already the fill color — drop the undo snapshot we pushed so
          // a no-op fill doesn't leave a dead undo step.
          state.undoStack = state.undoStack.slice(0, -1);
          syncHistoryButtons();
          return;
        }
        playHaptic('magic-b');
        updateState(
          state,
          {
            spriteDataUrl: canvas.toDataURL('image/png'),
            status: 'preview',
            message: t('status.fill.done'),
            source: 'drawing',
          },
          render,
        );
      }, 0);
      return;
    }

    isDrawing = true;
    canvas.setPointerCapture(event.pointerId);
    pushUndo();
    applyToolSettings();

    // Draw a dot at the press point so a single tap (no drag) still leaves a
    // mark — essential for young children. A following drag continues from the
    // same point via quadratic smoothing, so there is no double-draw.
    lastPoint = point;
    lastMid = point;
    context.beginPath();
    context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fillStyle = context.strokeStyle;
    context.fill();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!isDrawing) {
      return;
    }
    if (event.pointerType === 'touch' && !event.isPrimary) return;

    const point = getCanvasPoint(canvas, event);

    // Quadratic-curve smoothing: draw through the midpoint between the last two
    // sampled points, using the previous point as the control point. Produces
    // smooth strokes instead of jagged polylines at ~60Hz pointer sampling.
    const mid = midpoint(lastPoint, point);
    context.beginPath();
    context.moveTo(lastMid.x, lastMid.y);
    context.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
    context.stroke();

    lastPoint = point;
    lastMid = mid;
  });

  function finishDrawing(event) {
    if (event.pointerType === 'touch' && !event.isPrimary) return;
    if (!isDrawing) {
      return;
    }

    isDrawing = false;
    canvas.releasePointerCapture(event.pointerId);
    context.globalCompositeOperation = 'source-over';
    updateState(
      state,
      {
        spriteDataUrl: canvas.toDataURL('image/png'),
        status: 'preview',
        message: t('status.draw.done'),
        source: 'drawing',
      },
      render,
    );
  }

  canvas.addEventListener('pointerup', finishDrawing);
  canvas.addEventListener('pointercancel', finishDrawing);

  // Apply a history transition (undo or redo): paint the returned snapshot,
  // sync the two stacks + button states, and reflect emptiness in app state.
  function applyHistory(result) {
    if (!result.snapshot) return;
    context.putImageData(result.snapshot, 0, 0);
    state.undoStack = result.undoStack;
    state.redoStack = result.redoStack;
    syncHistoryButtons();
    const blank = state.undoStack.length === 0;
    // Redo-forward from a blank canvas must re-mark content so register re-enables.
    state.hasContent = !blank;
    updateState(
      state,
      {
        spriteDataUrl: canvas.toDataURL('image/png'),
        status: blank ? 'idle' : 'preview',
        message: blank ? '' : t('status.draw.done'),
        source: blank ? '' : 'drawing',
      },
      render,
    );
  }

  undoButton?.addEventListener('click', () => {
    if (!state.undoStack.length) return;
    applyHistory(applyUndo(state.undoStack, state.redoStack, snapshot()));
  });

  redoButton?.addEventListener('click', () => {
    if (!state.redoStack.length) return;
    applyHistory(applyRedo(state.undoStack, state.redoStack, snapshot()));
  });

  let clearPending = false;
  let clearConfirmTimer = null;

  clearButton?.addEventListener('click', () => {
    if (!clearPending) {
      // First tap: show confirm state
      clearPending = true;
      clearButton.textContent = t('draw.clear.confirm');
      clearButton.classList.add('is-confirm-pending');
      clearConfirmTimer = setTimeout(() => {
        clearPending = false;
        clearButton.textContent = t('draw.clear');
        clearButton.classList.remove('is-confirm-pending');
      }, 2500);
      return;
    }
    // Second tap: actually clear
    clearPending = false;
    if (clearConfirmTimer) { window.clearTimeout(clearConfirmTimer); clearConfirmTimer = null; }
    clearButton.textContent = t('draw.clear');
    clearButton.classList.remove('is-confirm-pending');
    context.clearRect(0, 0, canvas.width, canvas.height);
    state.undoStack = [];
    state.redoStack = [];
    state.hasContent = false;
    syncHistoryButtons();
    updateState(state, { spriteDataUrl: '', status: 'idle', message: '', source: '' }, render);
  });
}

function bindBottomSheetGrabber(panel, state, render) {
  const grabber = panel.querySelector('[data-fish-input-grabber]');
  if (!grabber) return;

  let startY = 0;
  let dragging = false;
  let startStage = 'peek';

  grabber.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    dragging = true;
    startY = e.clientY;
    startStage = state.sheetStage === 'full' ? 'full' : 'peek';
    grabber.setPointerCapture(e.pointerId);
  });

  grabber.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    if (!dragging) return;
    dragging = false;
    grabber.releasePointerCapture(e.pointerId);
    const dy = e.clientY - startY;
    // Short tap = toggle peek<->full. Drag up >= 40 = full. Drag down >= 40 from peek = close.
    if (Math.abs(dy) < 10) {
      state.sheetStage = startStage === 'full' ? 'peek' : 'full';
      render();
      return;
    }
    if (dy <= -40) {
      state.sheetStage = 'full';
      render();
      return;
    }
    if (dy >= 40) {
      if (startStage === 'full') {
        state.sheetStage = 'peek';
      } else {
        state.sheetStage = 'closed';
        state.isExpanded = false;
      }
      render();
    }
  });

  grabber.addEventListener('pointercancel', () => { dragging = false; });
}

function bindBackdrop(root, state, render) {
  const backdrop = root.querySelector('[data-fish-input-backdrop]');
  backdrop?.addEventListener('click', () => {
    state.sheetStage = 'closed';
    state.isExpanded = false;
    render();
  });
}

let visualViewportBound = false;
function bindVisualViewportInset() {
  if (visualViewportBound) return;
  if (typeof window === 'undefined' || !window.visualViewport) return;
  visualViewportBound = true;
  const update = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  };
  window.visualViewport.addEventListener('resize', update);
  window.visualViewport.addEventListener('scroll', update);
  update();
}

export function bindFishInputEvents(root, state, render, options = {}) {
  const toggleButton = root.querySelector('[data-toggle-fish-input]');
  const fileInput = root.querySelector('[data-fish-file]');
  const nameInput = root.querySelector('[data-fish-name]');
  const movementSelect = root.querySelector('[data-fish-movement]');
  const registerButton = root.querySelector('[data-register-fish-image]');
  const langToggle = root.querySelector('[data-lang-toggle]');

  langToggle?.addEventListener('click', async () => {
    const next = getCurrentLang() === 'ko' ? 'en' : 'ko';
    try {
      await setLang(next);
    } catch { /* keep current language on failure */ }
    render();
  });

  toggleButton?.addEventListener('click', () => {
    const next = !state.isExpanded;
    updateState(
      state,
      {
        isExpanded: next,
        sheetStage: next ? 'peek' : 'closed',
        activeTab: next ? 'catalog' : state.activeTab,
      },
      render,
    );
  });

  const playHaptic = options.playHaptic ?? (() => {});
  setupDrawingCanvas(root, state, render, playHaptic);

  nameInput?.addEventListener('input', (event) => {
    state.name = event.target.value;
    if (registerButton) {
      registerButton.disabled = !canRegister(state);
    }
  });

  movementSelect?.addEventListener('change', (event) => {
    state.movementEnabled = event.target.value !== 'off';
  });

  root.querySelectorAll('[data-fish-input-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.fishInputTab === 'create' ? 'create' : 'catalog';
      if (state.activeTab === next) return;
      const patch = { activeTab: next };
      if (next === 'create') patch.sheetStage = 'full';
      updateState(state, patch, render);
    });
  });

  root.querySelectorAll('[data-fish-prop-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.fishPropType === 'deco' ? 'deco' : 'fish';
      if (state.type === next) return;
      updateState(state, { type: next }, render);
    });
  });

  fileInput?.addEventListener('change', async (event) => {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    if (!isSupportedImageFile(file)) {
      // Reset so re-selecting the same file still fires a change event.
      event.target.value = '';
      updateState(
        state,
        {
          spriteDataUrl: '',
          status: 'invalid',
          message: t('status.file.notImage'),
          source: '',
        },
        render,
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const spriteDataUrl = await resizeImageToSprite(dataUrl);

      updateState(
        state,
        {
          spriteDataUrl,
          status: 'preview',
          message: t('status.upload.ready'),
          source: 'upload',
        },
        render,
      );
    } catch (error) {
      console.warn('Fish image could not be processed.', error);
      updateState(
        state,
        {
          spriteDataUrl: '',
          status: 'invalid',
          message: t('status.file.cannotOpen'),
          source: '',
        },
        render,
      );
    } finally {
      // Reset so re-selecting the same file re-triggers processing.
      event.target.value = '';
    }
  });

  registerButton?.addEventListener('click', () => {
    if (!canRegister(state)) {
      updateState(
        state,
        {
          status: state.status === 'invalid' ? 'invalid' : 'idle',
          message: t('status.needImage'),
        },
        render,
      );
      return;
    }

    const draft = saveFishDraft(state);

    options.onRegister?.(draft);
    const displayName = draft.name || DEFAULT_FISH_NAME;
    const message = draft.storageError
      ? t('status.storageFull')
      : buildRegisterMessage(draft.type, displayName, t);
    updateState(
      state,
      {
        status: 'preview',
        message,
      },
      render,
    );
  });

  const panel = root.querySelector('.fish-input-widget');
  if (panel) bindBottomSheetGrabber(panel, state, render);
  bindBackdrop(root, state, render);
  bindVisualViewportInset();
}
