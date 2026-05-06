// SVG viewBox coordinate space: 0 0 1152 780
// Bubbles rise from sand, seaweed bases, and garden eel heads

const WATER_TOP_Y = 158;
const FADE_ZONE = 60;

const SOURCES = [
  {
    id: 'sand',
    type: 'sand',
    xMin: 280,
    xMax: 880,
    y: 652,
    xVariance: 0,
    intervalMin: 4000,
    intervalMax: 10000,
  },
  {
    id: 'seaweed-left',
    type: 'seaweed',
    xMin: 0,
    xMax: 0,
    xCenter: 318,
    y: 647,
    xVariance: 22,
    intervalMin: 6000,
    intervalMax: 15000,
  },
  {
    id: 'seaweed-right',
    type: 'seaweed',
    xMin: 0,
    xMax: 0,
    xCenter: 828,
    y: 650,
    xVariance: 18,
    intervalMin: 7000,
    intervalMax: 16000,
  },
  {
    id: 'eel-one',
    type: 'eel',
    xMin: 0,
    xMax: 0,
    xCenter: 520,
    y: 430,
    xVariance: 8,
    intervalMin: 5000,
    intervalMax: 12000,
  },
  {
    id: 'eel-two',
    type: 'eel',
    xMin: 0,
    xMax: 0,
    xCenter: 683,
    y: 445,
    xVariance: 8,
    intervalMin: 6000,
    intervalMax: 13000,
  },
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
  let x;

  if (source.type === 'sand') {
    x = source.xMin + Math.random() * (source.xMax - source.xMin);
  } else {
    x = source.xCenter + (Math.random() - 0.5) * 2 * source.xVariance;
  }

  return {
    id,
    x,
    originX: x,
    y: source.y,
    sourceY: source.y,
    radius: 3 + Math.random() * 8,
    riseSpeed: 22 + Math.random() * 32,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 0.7 + Math.random() * 1.1,
    driftAmplitude: 5 + Math.random() * 10,
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
