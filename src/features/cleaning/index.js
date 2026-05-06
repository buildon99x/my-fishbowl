export const COMPLETION_THRESHOLD = 0.8;

const BRUSH_RADIUS = 40;
const SAMPLE_STEP = 4;
const ALPHA_VISIBILITY_THRESHOLD = 32;

export function createCleaningState() {
  return {
    cleaningMode: false,
    cleaning: false,
    cleaned: false,
    cleaningProgress: 0,
    snapshotData: null,
    initialOpaqueCount: 0,
    completionTimer: null,
  };
}

function countOpaquePixels(imageData) {
  const { data } = imageData;
  let count = 0;
  for (let i = 3; i < data.length; i += 4 * SAMPLE_STEP) {
    if (data[i] > ALPHA_VISIBILITY_THRESHOLD) count++;
  }
  return count;
}

export function snapshotCanvas(canvas, cleaningState) {
  if (!canvas || !canvas.width || !canvas.height) return;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  cleaningState.snapshotData = imageData;
  cleaningState.initialOpaqueCount = countOpaquePixels(imageData);
  cleaningState.cleaningProgress = cleaningState.initialOpaqueCount === 0 ? 1 : 0;
}

export function applyBrush(canvas, clientX, clientY, cleaningState) {
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

  if (cleaningState.initialOpaqueCount > 0) {
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const remaining = countOpaquePixels(current);
    cleaningState.cleaningProgress = Math.min(1, 1 - remaining / cleaningState.initialOpaqueCount);
  } else {
    cleaningState.cleaningProgress = 1;
  }

  return cleaningState.cleaningProgress;
}
