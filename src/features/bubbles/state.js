// SVG viewBox coordinate space: 0 0 1152 780
//
// Bubble sources are placed at the sand surface (y ≈ 650) for all origins.
// Garden eel heads sway ±15 SVG units via CSS animation, so using their
// animated head position would require live DOM measurement. Spawning from
// the sand base where each eel is rooted is always visually correct and
// avoids the mismatch.
//
// Rise speed is kept fast enough (35–60 SVG/s) so travel time from sand to
// water surface stays under ~14 s. Combined with 10–30 s intervals per
// source, at most 1–2 bubbles are in flight from any one source, keeping
// the total on screen around 2–4 at a time ("가끔씩" natural feel).

const WATER_TOP_Y = 158;
const FADE_ZONE = 55;

// Each source: { id, xMin, xMax, y, intervalMin, intervalMax }
// x spawn position is sampled uniformly from [xMin, xMax].
const SOURCES = [
  // Random spot along the sand bed
  { id: 'sand', xMin: 320, xMax: 840, y: 651, intervalMin: 12000, intervalMax: 28000 },
  // Left seaweed cluster base (SVG paths start at x≈306–336, y≈654)
  { id: 'seaweed-left', xMin: 302, xMax: 342, y: 648, intervalMin: 14000, intervalMax: 32000 },
  // Right seaweed cluster base (SVG paths start at x≈818–838, y≈657)
  { id: 'seaweed-right', xMin: 814, xMax: 844, y: 651, intervalMin: 16000, intervalMax: 36000 },
  // Garden eel one — rooted at sand base x≈514, y≈650
  { id: 'eel-one', xMin: 506, xMax: 524, y: 648, intervalMin: 10000, intervalMax: 24000 },
  // Garden eel two — rooted at sand base x≈642, y≈651
  { id: 'eel-two', xMin: 634, xMax: 652, y: 649, intervalMin: 12000, intervalMax: 28000 },
];

export function createBubblesState() {
  const now = performance.now();

  return {
    bubbles: [],
    sources: SOURCES.map((src) => ({
      ...src,
      nextEmitAt: now + src.intervalMin + Math.random() * (src.intervalMax - src.intervalMin),
    })),
    lastTickAt: 0,
    nextId: 0,
  };
}

function spawnBubble(source, id) {
  const x = source.xMin + Math.random() * (source.xMax - source.xMin);

  return {
    id,
    x,
    originX: x,
    y: source.y,
    sourceY: source.y,
    radius: 3 + Math.random() * 8,
    // Faster rise keeps travel time short, limiting simultaneous bubble count.
    riseSpeed: 35 + Math.random() * 25,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 0.6 + Math.random() * 1.0,
    driftAmplitude: 4 + Math.random() * 9,
    opacity: 0,
  };
}

export function tickBubbles(state, nowMs) {
  if (state.lastTickAt === 0) {
    state.lastTickAt = nowMs;
  }

  const deltaSeconds = Math.min((nowMs - state.lastTickAt) / 1000, 0.1);

  state.lastTickAt = nowMs;

  for (const source of state.sources) {
    if (nowMs >= source.nextEmitAt) {
      state.bubbles.push(spawnBubble(source, `b${state.nextId++}`));
      source.nextEmitAt =
        nowMs + source.intervalMin + Math.random() * (source.intervalMax - source.intervalMin);
    }
  }

  const removed = [];

  state.bubbles = state.bubbles.filter((bubble) => {
    bubble.y -= bubble.riseSpeed * deltaSeconds;
    bubble.driftPhase += bubble.driftSpeed * deltaSeconds;
    bubble.x = bubble.originX + Math.sin(bubble.driftPhase) * bubble.driftAmplitude;

    const distFromSource = bubble.sourceY - bubble.y;
    const fadeInZone = 24;

    if (distFromSource < fadeInZone) {
      bubble.opacity = distFromSource / fadeInZone;
    } else if (bubble.y < WATER_TOP_Y + FADE_ZONE) {
      bubble.opacity = Math.max(0, (bubble.y - WATER_TOP_Y) / FADE_ZONE);
    } else {
      bubble.opacity = 1;
    }

    if (bubble.y < WATER_TOP_Y) {
      removed.push(bubble.id);
      return false;
    }

    return true;
  });

  return { removed };
}
