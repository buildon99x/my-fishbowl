import { DEFAULT_FISH_NAME, createFishInputState, saveFishDraft } from './state.js';
import { renderFishInputPanel } from './view.js';
import { loadImage, resizeImageToSprite } from '../../lib/spriteResize.js';
import { setLang, getCurrentLang, t } from '../../lib/i18n.js';

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

const MAX_UNDO = 20;

function floodFill(ctx, canvas, startX, startY, tolerance = 30) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Bounds guard — reject out-of-range seed coordinates.
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const idx = (startY * width + startX) * 4;
  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];

  const queue = [[startX, startY]];
  let head = 0;
  const visited = new Uint8Array(width * height);

  while (head < queue.length) {
    const [x, y] = queue[head++];
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = y * width + x;
    if (visited[i]) continue;
    visited[i] = 1;

    const pi = i * 4;
    const dr = Math.abs(data[pi] - targetR);
    const dg = Math.abs(data[pi + 1] - targetG);
    const db = Math.abs(data[pi + 2] - targetB);

    if (dr + dg + db > tolerance) continue;

    data[pi + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function setupDrawingCanvas(root, state, render) {
  const canvas = root.querySelector('[data-fish-canvas]');
  const clearButton = root.querySelector('[data-clear-drawing]');
  const undoButton = root.querySelector('[data-draw-undo]');
  const toolButtons = root.querySelectorAll('[data-draw-tool]');

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  let isDrawing = false;
  let currentTool = 'pen';
  const undoStack = [];

  function pushUndo() {
    if (undoStack.length >= MAX_UNDO) undoStack.shift();
    undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (undoButton) undoButton.disabled = false;
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
    });
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' && !event.isPrimary) return;

    const point = getCanvasPoint(canvas, event);

    if (currentTool === 'fill') {
      if (canvas.classList.contains('is-processing')) return;
      pushUndo();
      canvas.classList.add('is-processing');
      canvas.style.cursor = 'wait';
      setTimeout(() => {
        floodFill(context, canvas, Math.round(point.x), Math.round(point.y));
        canvas.classList.remove('is-processing');
        canvas.style.cursor = '';
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

    context.beginPath();
    context.moveTo(point.x, point.y);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!isDrawing) {
      return;
    }
    if (event.pointerType === 'touch' && !event.isPrimary) return;

    const point = getCanvasPoint(canvas, event);

    context.lineTo(point.x, point.y);
    context.stroke();
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

  undoButton?.addEventListener('click', () => {
    if (!undoStack.length) return;
    const snap = undoStack.pop();
    context.putImageData(snap, 0, 0);
    if (undoButton) undoButton.disabled = undoStack.length === 0;
    updateState(
      state,
      {
        spriteDataUrl: canvas.toDataURL('image/png'),
        status: undoStack.length === 0 ? 'idle' : 'preview',
        message: undoStack.length === 0 ? '' : t('status.draw.done'),
        source: undoStack.length === 0 ? '' : 'drawing',
      },
      render,
    );
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
    undoStack.length = 0;
    if (undoButton) undoButton.disabled = true;
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

  setupDrawingCanvas(root, state, render);

  nameInput?.addEventListener('input', (event) => {
    state.name = event.target.value;
    if (registerButton) {
      registerButton.disabled = !state.spriteDataUrl || state.status === 'invalid';
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
      updateState(
        state,
        {
          spriteDataUrl: '',
          status: 'invalid',
          message: getCurrentLang() === 'ko'
            ? '이 파일은 사진이 아니에요. 📷 사진 파일을 선택해 주세요!'
            : "That's not a picture file! Try a photo (JPG or PNG).",
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
          message: '업로드한 이미지 미리보기가 준비됐어요.',
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
          message: getCurrentLang() === 'ko'
            ? '이 사진을 열 수 없어요. 다른 사진을 골라 주세요! 😊'
            : "Oops, I can't open this picture. Try a different one!",
          source: '',
        },
        render,
      );
    }
  });

  registerButton?.addEventListener('click', () => {
    if (!state.spriteDataUrl || state.status === 'invalid') {
      updateState(
        state,
        {
          status: state.status === 'invalid' ? 'invalid' : 'idle',
          message: '먼저 이미지를 추가해 주세요.',
        },
        render,
      );
      return;
    }

    const draft = saveFishDraft(state);

    options.onRegister?.(draft);
    const displayName = draft.name || DEFAULT_FISH_NAME;
    const message = draft.type === 'deco'
      ? `${displayName}이(가) 자리를 잡았어요!`
      : `${displayName}이(가) 헤엄칠 준비를 마쳤어요!`;
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
