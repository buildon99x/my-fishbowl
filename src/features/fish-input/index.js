import { DEFAULT_FISH_NAME, createFishInputState, saveFishDraft } from './state.js';
import { renderFishInputPanel } from './view.js';
import { loadImage, resizeImageToSprite } from '../../lib/spriteResize.js';

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

function setupDrawingCanvas(root, state, render) {
  const canvas = root.querySelector('[data-fish-canvas]');
  const clearButton = root.querySelector('[data-clear-drawing]');

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  let isDrawing = false;

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 7;
  context.strokeStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-ink')
      .trim() || '#0a0a0a';
  paintStoredSprite(canvas, state.spriteDataUrl);

  canvas.addEventListener('pointerdown', (event) => {
    isDrawing = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(canvas, event);

    context.beginPath();
    context.moveTo(point.x, point.y);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!isDrawing) {
      return;
    }

    const point = getCanvasPoint(canvas, event);

    context.lineTo(point.x, point.y);
    context.stroke();
  });

  function finishDrawing(event) {
    if (!isDrawing) {
      return;
    }

    isDrawing = false;
    canvas.releasePointerCapture(event.pointerId);
    updateState(
      state,
      {
        spriteDataUrl: canvas.toDataURL('image/png'),
        status: 'preview',
        message: '그림 미리보기가 준비됐어요.',
        source: 'drawing',
      },
      render,
    );
  }

  canvas.addEventListener('pointerup', finishDrawing);
  canvas.addEventListener('pointercancel', finishDrawing);

  clearButton?.addEventListener('click', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    updateState(
      state,
      {
        spriteDataUrl: '',
        status: 'idle',
        message: '',
        source: '',
      },
      render,
    );
  });
}

function bindBottomSheetGrabber(panel, state, render) {
  const grabber = panel.querySelector('[data-fish-input-grabber]');
  if (!grabber) return;

  let startY = 0;
  let dragging = false;
  let startStage = 'peek';

  grabber.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    startStage = state.sheetStage === 'full' ? 'full' : 'peek';
    grabber.setPointerCapture(e.pointerId);
  });

  grabber.addEventListener('pointerup', (e) => {
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
      updateState(state, { activeTab: next }, render);
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
          message: 'PNG, JPG, JPEG, WEBP 파일만 등록할 수 있어요.',
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
          message: '이미지를 처리할 수 없어요. 다른 파일을 선택해 주세요.',
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
