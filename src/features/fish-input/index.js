import { createFishInputState, saveFishDraft } from './state.js';
import { renderFishInputPanel } from './view.js';

const SPRITE_WIDTH = 240;
const SPRITE_HEIGHT = 160;
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });
}

function isSupportedImageFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return SUPPORTED_IMAGE_TYPES.has(file.type) || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

async function resizeImageToSprite(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const scale = Math.min(SPRITE_WIDTH / image.naturalWidth, SPRITE_HEIGHT / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const x = Math.round((SPRITE_WIDTH - width) / 2);
  const y = Math.round((SPRITE_HEIGHT - height) / 2);

  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  context.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL('image/png');
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
        message: 'Drawing preview is ready.',
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

export function bindFishInputEvents(root, state, render, options = {}) {
  const toggleButton = root.querySelector('[data-toggle-fish-input]');
  const fileInput = root.querySelector('[data-fish-file]');
  const nameInput = root.querySelector('[data-fish-name]');
  const registerButton = root.querySelector('[data-register-fish-image]');

  toggleButton?.addEventListener('click', () => {
    updateState(state, { isExpanded: !state.isExpanded }, render);
  });

  setupDrawingCanvas(root, state, render);

  nameInput?.addEventListener('input', (event) => {
    state.name = event.target.value;
    if (registerButton) {
      registerButton.disabled = !state.spriteDataUrl || state.status === 'invalid' || !state.name.trim();
    }
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
          message: 'Only PNG, JPG, JPEG, and WEBP files can be registered.',
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
          message: 'Uploaded image preview is ready.',
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
          message: 'The selected image could not be processed.',
          source: '',
        },
        render,
      );
    }
  });

  registerButton?.addEventListener('click', () => {
    if (!state.spriteDataUrl || state.status === 'invalid' || !state.name.trim()) {
      updateState(
        state,
        {
          status: state.status === 'invalid' ? 'invalid' : 'idle',
          message: 'Add an image and fish name before registering.',
        },
        render,
      );
      return;
    }

    const draft = saveFishDraft(state);

    options.onRegister?.(draft);
    updateState(
      state,
      {
        status: 'preview',
        message: `${state.name.trim()} is ready as a fish sprite.`,
      },
      render,
    );
  });
}
