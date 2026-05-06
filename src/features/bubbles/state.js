// SVG viewBox coordinate space: 0 0 1152 780
//
// All bubble sources spawn from the sand surface (y ≈ 650) so their position
// is always visually correct regardless of CSS sway animations on plants/eels.
//
// Rise speed (35–60 SVG/s) keeps travel time under ~14 s. With 10–36 s
// emission intervals per source, at most 1–2 bubbles are in flight from any
// one source (~2–4 total on screen).
//
// Pause mechanism: at random intervals (first after 20–40 s, then every
// 15–35 s) all emission stops for 2–5 s. Source timers that would have fired
// during the pause are redistributed to the 0–4 s window after it ends so
// that the resume feels gradual rather than a sudden burst.

const WATER_TOP_Y = 158;
const FADE_ZONE = 55;

const SOURCES = [
  { id: 'sand', xMin: 320, xMax: 840, y: 651, intervalMin: 12000, intervalMax: 28000 },
  { id: 'seaweed-left', xMin: 302, xMax: 342, y: 648, intervalMin: 14000, intervalMax: 32000 },
  { id: 'seaweed-right', xMin: 814, xMax: 844, y: 651, intervalMin: 16000, intervalMax: 36000 },
  { id: 'eel-one', xMin: 506, xMax: 524, y: 648, intervalMin: 10000, intervalMax: 24000 },
  { id: 'eel-two', xMin: 634, xMax: 652, y: 649, intervalMin: 12000, intervalMax: 28000 },
];

// How long after startup before the first pause (ms)
const FIRST_PAUSE_DELAY_MIN = 20000;
const FIRST_PAUSE_DELAY_MAX = 40000;

// How long each pause lasts (ms)
const PAUSE_DURATION_MIN = 2000;
const PAUSE_DURATION_MAX = 5000;

// Gap between pause end and the next pause start (ms)
const PAUSE_GAP_MIN = 15000;
const PAUSE_GAP_MAX = 35000;

// Max spread added to source timers when they are deferred past a pause (ms)
const RESUME_SPREAD = 4000;

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
    pauseUntilMs: 0,
    nextPauseAt: now + FIRST_PAUSE_DELAY_MIN + Math.random() * (FIRST_PAUSE_DELAY_MAX - FIRST_PAUSE_DELAY_MIN),
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

  // Start a new pause when scheduled and not already paused.
  if (nowMs >= state.nextPauseAt && nowMs >= state.pauseUntilMs) {
    const duration =
      PAUSE_DURATION_MIN + Math.random() * (PAUSE_DURATION_MAX - PAUSE_DURATION_MIN);

    state.pauseUntilMs = nowMs + duration;
    state.nextPauseAt =
      state.pauseUntilMs + PAUSE_GAP_MIN + Math.random() * (PAUSE_GAP_MAX - PAUSE_GAP_MIN);

    // Spread out any source timers that would have fired during the pause so
    // the resume doesn't produce a simultaneous burst from every source.
    for (const source of state.sources) {
      if (source.nextEmitAt < state.pauseUntilMs) {
        source.nextEmitAt = state.pauseUntilMs + Math.random() * RESUME_SPREAD;
      }
    }
  }

  // Emit new bubbles only while not paused.
  if (nowMs >= state.pauseUntilMs) {
    for (const source of state.sources) {
      if (nowMs >= source.nextEmitAt) {
        state.bubbles.push(spawnBubble(source, `b${state.nextId++}`));
        source.nextEmitAt =
          nowMs + source.intervalMin + Math.random() * (source.intervalMax - source.intervalMin);
      }
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
