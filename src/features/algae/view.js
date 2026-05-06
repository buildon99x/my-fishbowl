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
}
