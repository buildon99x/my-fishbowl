const COMPLETION_THRESHOLD = 0.8;

const BRUSH_RADIUS = 40;
const VISIBLE_ALPHA_THRESHOLD = 8;

export function createCleaningState() {
  return {
    cleaningMode: false,
    cleaning: false,
    cleaned: false,
    cleaningProgress: 0,
    snapshotData: null,
    initialAlphaSum: 0,
    initialAlgaePixels: 0,
    completionTimer: null,
  };
}

function countVisibleAlgaePixels(imageData) {
  const { data } = imageData;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= VISIBLE_ALPHA_THRESHOLD) count += 1;
  }
  return count;
}

export function calculateCleaningProgress(initialVisiblePixels, currentImageData) {
  if (initialVisiblePixels <= 0) return 1;

  const remainingVisiblePixels = countVisibleAlgaePixels(currentImageData);
  return Math.min(1, Math.max(0, 1 - remainingVisiblePixels / initialVisiblePixels));
}

export function snapshotCanvas(canvas, cleaningState) {
  if (!canvas || !canvas.width || !canvas.height) return;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  cleaningState.snapshotData = imageData;
  cleaningState.initialAlgaePixels = countVisibleAlgaePixels(imageData);
  cleaningState.initialAlphaSum = cleaningState.initialAlgaePixels;
  cleaningState.cleaningProgress = cleaningState.initialAlgaePixels === 0 ? 1 : 0;
}

function applyBrush(canvas, clientX, clientY, cleaningState) {
  if (!canvas || cleaningState.cleaned) return cleaningState.cleaningProgress;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top) * scaleY;
  const radius = BRUSH_RADIUS * ((scaleX + scaleY) / 2);

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (cleaningState.initialAlgaePixels > 0) {
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    cleaningState.cleaningProgress = calculateCleaningProgress(cleaningState.initialAlgaePixels, current);
  } else {
    cleaningState.cleaningProgress = 1;
  }

  return cleaningState.cleaningProgress;
}

export function clearAlgaeCanvas(canvas) {
  if (!canvas || !canvas.width || !canvas.height) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export { renderCleaningProgressBar, renderCleaningOverlay, renderCleaningExitButton } from './view.js';

export function exitCleaningMode(cleaningState) {
  if (cleaningState.completionTimer) {
    window.clearTimeout(cleaningState.completionTimer);
    cleaningState.completionTimer = null;
  }
  cleaningState.cleaningMode = false;
  cleaningState.cleaning = false;
  cleaningState.cleaned = false;
  cleaningState.cleaningProgress = 0;
  cleaningState.snapshotData = null;
  cleaningState.initialAlphaSum = 0;
  cleaningState.initialAlgaePixels = 0;
}

function addTouchRipple(overlay, clientX, clientY) {
  const rect = overlay.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'cleaning-touch-ripple';
  ripple.style.left = `${clientX - rect.left}px`;
  ripple.style.top = `${clientY - rect.top}px`;
  overlay.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

export function bindCleaningEvents(root, aquarium, appState, { render, save }) {
  const { cleaningState } = appState;

  // Sticky exit button is rendered even when the overlay is gone (e.g. between
  // ticks); bind it before the overlay early-return.
  root.querySelector('[data-cleaning-exit]')?.addEventListener('click', () => {
    exitCleaningMode(cleaningState);
    render();
  });

  const overlay = root.querySelector('[data-cleaning-overlay]');
  if (!overlay) return;

  const algaeCanvas = root.querySelector('[data-algae-canvas]');
  const cursor = root.querySelector('[data-cleaning-cursor]');
  const progressFill = root.querySelector('[data-cleaning-progress-fill]');
  const progressLabel = root.querySelector('[data-cleaning-progress-label]');
  const progressBar = root.querySelector('[data-cleaning-progress-bar]');

  function updateProgressUI() {
    const pct = Math.round(cleaningState.cleaningProgress * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = `${pct}%`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
  }

  function onBrush(clientX, clientY) {
    const progress = applyBrush(algaeCanvas, clientX, clientY, cleaningState);
    updateProgressUI();

    if (progress >= COMPLETION_THRESHOLD && !cleaningState.cleaned) {
      cleaningState.cleaned = true;
      cleaningState.cleaningProgress = 1;
      clearAlgaeCanvas(algaeCanvas);
      updateProgressUI();
      aquarium.cleanliness = 100;
      aquarium.algaeLevel = 0;
      aquarium.lastCleanedAt = new Date().toISOString();
      aquarium.updatedAt = new Date().toISOString();
      save(aquarium);

      const msg = document.createElement('div');
      msg.className = 'cleaning-complete-message';
      msg.dataset.cleaningComplete = '';
      msg.textContent = '✨ 청소 완료!';
      overlay.appendChild(msg);

      cleaningState.completionTimer = window.setTimeout(() => {
        exitCleaningMode(cleaningState);
        render();
      }, 1500);
    }
  }

  function moveCursor(clientX, clientY) {
    if (!cursor) return;
    const rect = overlay.getBoundingClientRect();
    cursor.style.left = `${clientX - rect.left}px`;
    cursor.style.top = `${clientY - rect.top}px`;
    cursor.style.display = 'block';
  }

  overlay.addEventListener('mouseenter', (e) => moveCursor(e.clientX, e.clientY));

  overlay.addEventListener('mousemove', (e) => {
    moveCursor(e.clientX, e.clientY);
    if (cleaningState.cleaning) onBrush(e.clientX, e.clientY);
  });

  overlay.addEventListener('mouseleave', () => {
    if (cursor) cursor.style.display = 'none';
    cleaningState.cleaning = false;
  });

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    cleaningState.cleaning = true;
    onBrush(e.clientX, e.clientY);
  });

  overlay.addEventListener('mouseup', () => {
    cleaningState.cleaning = false;
  });

  overlay.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      cleaningState.cleaning = true;
      const touch = e.touches[0];
      onBrush(touch.clientX, touch.clientY);
      addTouchRipple(overlay, touch.clientX, touch.clientY);
    },
    { passive: false },
  );

  overlay.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onBrush(touch.clientX, touch.clientY);
      addTouchRipple(overlay, touch.clientX, touch.clientY);
    },
    { passive: false },
  );

  overlay.addEventListener('touchend', () => {
    cleaningState.cleaning = false;
  });

  overlay.addEventListener('touchcancel', () => {
    cleaningState.cleaning = false;
  });
}
