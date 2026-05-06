const BOWL_PATH_NORMALIZED =
  'M0.122 0.049 C0.145 0 0.836 0.003 0.865 0.049 C0.876 0.069 0.872 0.166 0.843 0.197 C0.952 0.335 1 0.505 0.977 0.666 C0.945 0.886 0.777 1 0.5 1 C0.222 1 0.059 0.869 0.025 0.655 C0 0.497 0.043 0.334 0.153 0.197 C0.123 0.157 0.112 0.076 0.122 0.049 Z';

const LEVEL_CONFIG = {
  1: {
    count: 5,
    countJitter: 2,
    radiusBase: 0.038,
    radiusJitter: 0.022,
    opacityMin: 0.30,
    opacityMax: 0.45,
    edgeBiasMin: 0.75,
    edgeBiasMax: 0.95,
  },
  2: {
    count: 12,
    countJitter: 3,
    radiusBase: 0.048,
    radiusJitter: 0.026,
    opacityMin: 0.40,
    opacityMax: 0.55,
    edgeBiasMin: 0.65,
    edgeBiasMax: 0.95,
  },
  3: {
    count: 22,
    countJitter: 4,
    radiusBase: 0.060,
    radiusJitter: 0.034,
    opacityMin: 0.50,
    opacityMax: 0.70,
    edgeBiasMin: 0.55,
    edgeBiasMax: 0.95,
  },
};

function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input) {
  if (input == null) return 0;
  const str = String(input);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generatePatches(rng, level, w, h) {
  const cfg = LEVEL_CONFIG[level];
  if (!cfg) return [];

  const count = Math.max(1, Math.round(cfg.count + (rng() * 2 - 1) * cfg.countJitter));
  const meanDim = (w + h) / 2;
  const patches = [];

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const edgeBias = cfg.edgeBiasMin + rng() * (cfg.edgeBiasMax - cfg.edgeBiasMin);
    const cx = w * 0.5 + Math.cos(angle) * w * 0.42 * edgeBias;
    const cy = h * 0.55 + Math.sin(angle) * h * 0.45 * edgeBias;
    const baseRadius = meanDim * (cfg.radiusBase + rng() * cfg.radiusJitter);
    const opacity = cfg.opacityMin + rng() * (cfg.opacityMax - cfg.opacityMin);

    patches.push({ cx, cy, baseRadius, opacity });
  }

  return patches;
}

function drawPatch(ctx, patch, rng) {
  const { cx, cy, baseRadius, opacity } = patch;
  const subCount = 2 + Math.floor(rng() * 2);

  for (let i = 0; i < subCount; i++) {
    const offsetAngle = rng() * Math.PI * 2;
    const offsetDist = i === 0 ? 0 : rng() * baseRadius * 0.35;
    const ox = cx + Math.cos(offsetAngle) * offsetDist;
    const oy = cy + Math.sin(offsetAngle) * offsetDist;

    const rx = baseRadius * (0.65 + rng() * 0.35);
    const ry = baseRadius * (0.55 + rng() * 0.4);
    const rotation = rng() * Math.PI;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(rotation);

    const radius = Math.max(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, `rgba(34, 110, 34, ${opacity})`);
    gradient.addColorStop(0.65, `rgba(34, 139, 34, ${(opacity * 0.55).toFixed(3)})`);
    gradient.addColorStop(1, 'rgba(34, 139, 34, 0)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function drawAlgaeLayer(canvas, algaeLevel, seed) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!w || !h) return;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (algaeLevel === 0) return;

  const level = Math.min(3, Math.max(1, Math.floor(algaeLevel)));

  ctx.save();
  const bowlNorm = new Path2D(BOWL_PATH_NORMALIZED);
  const bowlPath = new Path2D();
  bowlPath.addPath(bowlNorm, new DOMMatrix([w, 0, 0, h, 0, 0]));
  ctx.clip(bowlPath);

  const rng = mulberry32(hashSeed(seed));
  const patches = generatePatches(rng, level, w, h);
  for (const patch of patches) {
    drawPatch(ctx, patch, rng);
  }

  ctx.restore();
}
