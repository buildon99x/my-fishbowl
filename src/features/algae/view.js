const BOWL_PATH_NORMALIZED =
  'M0.122 0.049 C0.145 0 0.836 0.003 0.865 0.049 C0.876 0.069 0.872 0.166 0.843 0.197 C0.952 0.335 1 0.505 0.977 0.666 C0.945 0.886 0.777 1 0.5 1 C0.222 1 0.059 0.869 0.025 0.655 C0 0.497 0.043 0.334 0.153 0.197 C0.123 0.157 0.112 0.076 0.122 0.049 Z';

export function drawAlgaeLayer(canvas, algaeLevel) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!w || !h) return;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (algaeLevel === 0) return;

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  const bowlNorm = new Path2D(BOWL_PATH_NORMALIZED);
  const bowlPath = new Path2D();
  bowlPath.addPath(bowlNorm, new DOMMatrix([w, 0, 0, h, 0, 0]));
  ctx.clip(bowlPath);

  if (algaeLevel === 1) {
    ctx.fillStyle = 'rgba(34, 139, 34, 0.12)';
    ctx.fillRect(0, 0, w, h);
  } else if (algaeLevel === 2) {
    const outerR = Math.max(w, h) * 0.8;
    const innerR = Math.min(w, h) * 0.25;
    const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    gradient.addColorStop(0, 'rgba(34, 139, 34, 0)');
    gradient.addColorStop(0.6, 'rgba(34, 139, 34, 0.18)');
    gradient.addColorStop(1, 'rgba(34, 139, 34, 0.45)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  } else if (algaeLevel >= 3) {
    ctx.fillStyle = 'rgba(34, 139, 34, 0.55)';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}
