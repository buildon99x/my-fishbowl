import { ALGAE_MAX_LEVEL } from './state.js';

const WATER_PATH_NORMALIZED =
  'M0.1024 0.1821 C0.2066 0.1513 0.2960 0.2103 0.3950 0.1821 C0.4957 0.1526 0.5694 0.2128 0.6719 0.1821 C0.7431 0.1615 0.7951 0.1808 0.8438 0.2026 C0.9253 0.3333 0.9688 0.5167 0.9471 0.6705 C0.9175 0.8782 0.7622 0.9859 0.5061 0.9859 C0.2491 0.9859 0.0981 0.8615 0.0668 0.6603 C0.0434 0.5090 0.0616 0.3128 0.1024 0.1821 Z';

const ALGAE_CONFIG_MIN = {
  count: 3,
  countJitter: 1,
  radiusBase: 0.026,
  radiusJitter: 0.014,
  opacityMin: 0.18,
  opacityMax: 0.28,
  edgeBiasMin: 0.82,
  edgeBiasMax: 0.96,
};

const ALGAE_CONFIG_MAX = {
  count: 36.4,
  countJitter: 6.5,
  radiusBase: 0.064,
  radiusJitter: 0.036,
  opacityMin: 0.676,
  opacityMax: 0.936,
  edgeBiasMin: 0.50,
  edgeBiasMax: 0.96,
};

const PATCH_EFFECTIVE_RADIUS_FACTOR = 1.15;
const MAX_PLACEMENT_ATTEMPTS = 30;

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

function lerp(min, max, t) {
  return min + (max - min) * t;
}

export function getAlgaeRenderConfig(level) {
  const t = Math.min(1, Math.max(0, level / ALGAE_MAX_LEVEL));
  return {
    count: lerp(ALGAE_CONFIG_MIN.count, ALGAE_CONFIG_MAX.count, t),
    countJitter: lerp(ALGAE_CONFIG_MIN.countJitter, ALGAE_CONFIG_MAX.countJitter, t),
    radiusBase: lerp(ALGAE_CONFIG_MIN.radiusBase, ALGAE_CONFIG_MAX.radiusBase, t),
    radiusJitter: lerp(ALGAE_CONFIG_MIN.radiusJitter, ALGAE_CONFIG_MAX.radiusJitter, t),
    opacityMin: lerp(ALGAE_CONFIG_MIN.opacityMin, ALGAE_CONFIG_MAX.opacityMin, t),
    opacityMax: lerp(ALGAE_CONFIG_MIN.opacityMax, ALGAE_CONFIG_MAX.opacityMax, t),
    edgeBiasMin: lerp(ALGAE_CONFIG_MIN.edgeBiasMin, ALGAE_CONFIG_MAX.edgeBiasMin, t),
    edgeBiasMax: lerp(ALGAE_CONFIG_MIN.edgeBiasMax, ALGAE_CONFIG_MAX.edgeBiasMax, t),
  };
}

function tryPlacePatch(rng, cfg, w, h, meanDim, existing) {
  const baseRadius = meanDim * (cfg.radiusBase + rng() * cfg.radiusJitter);
  const effectiveRadius = baseRadius * PATCH_EFFECTIVE_RADIUS_FACTOR;

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const angle = rng() * Math.PI * 2;
    const edgeBias = cfg.edgeBiasMin + rng() * (cfg.edgeBiasMax - cfg.edgeBiasMin);
    const cx = w * 0.5 + Math.cos(angle) * w * 0.42 * edgeBias;
    const cy = h * 0.585 + Math.sin(angle) * h * 0.40 * edgeBias;

    let collides = false;
    for (const other of existing) {
      const dx = cx - other.cx;
      const dy = cy - other.cy;
      const minDist = effectiveRadius + other.effectiveRadius;
      if (dx * dx + dy * dy < minDist * minDist) {
        collides = true;
        break;
      }
    }
    if (!collides) {
      const opacity = cfg.opacityMin + rng() * (cfg.opacityMax - cfg.opacityMin);
      return { cx, cy, baseRadius, effectiveRadius, opacity };
    }
  }
  return null;
}

function generatePatches(rng, level, w, h) {
  const cfg = getAlgaeRenderConfig(level);

  const count = Math.max(1, Math.round(cfg.count + (rng() * 2 - 1) * cfg.countJitter));
  const meanDim = (w + h) / 2;
  const patches = [];

  for (let i = 0; i < count; i++) {
    const patch = tryPlacePatch(rng, cfg, w, h, meanDim, patches);
    if (patch) patches.push(patch);
  }

  return patches;
}

function drawPatch(ctx, patch, rng) {
  const { cx, cy, baseRadius, opacity } = patch;
  const subCount = 2 + Math.floor(rng() * 2);

  for (let i = 0; i < subCount; i++) {
    const offsetAngle = rng() * Math.PI * 2;
    const offsetDist = i === 0 ? 0 : rng() * baseRadius * 0.3;
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

  if (algaeLevel <= 0) return;

  const level = Math.min(ALGAE_MAX_LEVEL, Math.max(1, Math.floor(algaeLevel)));

  ctx.save();
  const waterNorm = new Path2D(WATER_PATH_NORMALIZED);
  const waterPath = new Path2D();
  waterPath.addPath(waterNorm, new DOMMatrix([w, 0, 0, h, 0, 0]));
  ctx.clip(waterPath);

  const rng = mulberry32(hashSeed(seed));
  const patches = generatePatches(rng, level, w, h);
  for (const patch of patches) {
    drawPatch(ctx, patch, rng);
  }

  ctx.restore();
}
