export const BEHAVIOR_STATUSES = ['cruising', 'idle', 'dart', 'wander', 'turning'];

export const BEHAVIOR_INTERVAL_MS = 3000;
export const DART_DURATION_MS = 800;
export const WANDER_DURATION_MS = 2000;
export const MOUSE_AVOID_DISTANCE = 80;

const PREFERRED_DEPTHS = ['top', 'middle', 'bottom'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomInRange(random, min, max) {
  return min + random() * (max - min);
}

function choosePreferredDepth(random) {
  return PREFERRED_DEPTHS[Math.min(Math.floor(random() * PREFERRED_DEPTHS.length), PREFERRED_DEPTHS.length - 1)];
}

function normalizeBehaviorStatus(value) {
  return BEHAVIOR_STATUSES.includes(value) ? value : 'cruising';
}

export function createFishLiveliness(fish = {}, nowMs = 0, random = Math.random) {
  return {
    speedMultiplier: Number.isFinite(fish.speedMultiplier)
      ? clamp(fish.speedMultiplier, 0.7, 1.3)
      : randomInRange(random, 0.7, 1.3),
    idleBias: Number.isFinite(fish.idleBias) ? clamp(fish.idleBias, 0, 0.4) : randomInRange(random, 0, 0.4),
    preferredDepth: PREFERRED_DEPTHS.includes(fish.preferredDepth) ? fish.preferredDepth : choosePreferredDepth(random),
    wavingFrequency: Number.isFinite(fish.wavingFrequency)
      ? clamp(fish.wavingFrequency, 2, 4)
      : randomInRange(random, 2, 4),
    wavingAmplitude: Number.isFinite(fish.wavingAmplitude)
      ? clamp(fish.wavingAmplitude, 2, 5)
      : randomInRange(random, 2, 5),
    behaviorStatus: normalizeBehaviorStatus(fish.behaviorStatus ?? fish.movementStatus),
    behaviorStartedAtMs: Number.isFinite(fish.behaviorStartedAtMs) ? fish.behaviorStartedAtMs : nowMs,
    dartUntilMs: Number.isFinite(fish.dartUntilMs) ? fish.dartUntilMs : 0,
    wanderUntilMs: Number.isFinite(fish.wanderUntilMs) ? fish.wanderUntilMs : 0,
    nextBehaviorAtMs: Number.isFinite(fish.nextBehaviorAtMs) && fish.nextBehaviorAtMs > 0
      ? fish.nextBehaviorAtMs
      : nowMs + BEHAVIOR_INTERVAL_MS,
  };
}

export function chooseNextBehavior(fish, nowMs, random = Math.random) {
  const idleWeight = 0.2 + clamp(fish.idleBias ?? 0, 0, 0.4);
  const dartWeight = fish.dartBoostUntilMs && nowMs < fish.dartBoostUntilMs ? 0.25 : 0.1;
  const weights = [
    ['cruising', 0.6],
    ['idle', idleWeight],
    ['dart', dartWeight],
    ['wander', 0.1],
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  let behaviorStatus = 'cruising';

  for (const [status, weight] of weights) {
    roll -= weight;
    if (roll <= 0) {
      behaviorStatus = status;
      break;
    }
  }

  return {
    ...fish,
    behaviorStatus,
    behaviorStartedAtMs: nowMs,
    dartUntilMs: behaviorStatus === 'dart' ? nowMs + DART_DURATION_MS : fish.dartUntilMs,
    wanderUntilMs: behaviorStatus === 'wander' ? nowMs + WANDER_DURATION_MS : fish.wanderUntilMs,
    nextBehaviorAtMs: nowMs + BEHAVIOR_INTERVAL_MS,
  };
}

export function resolveBehaviorState(fish, nowMs, random = Math.random, mouseState = null) {
  const mouse = mouseState?.isInside ? mouseState : null;

  if (mouse) {
    const distancePx = Math.hypot((fish.x - mouse.x) * mouse.widthPx / 100, (fish.y - mouse.y) * mouse.heightPx / 100);

    if (distancePx <= MOUSE_AVOID_DISTANCE) {
      return {
        ...fish,
        behaviorStatus: 'dart',
        behaviorStartedAtMs: nowMs,
        dartUntilMs: nowMs + DART_DURATION_MS,
        nextBehaviorAtMs: nowMs + DART_DURATION_MS + BEHAVIOR_INTERVAL_MS,
        avoidMouse: mouse,
      };
    }
  }

  if (fish.behaviorStatus === 'dart' && nowMs >= fish.dartUntilMs) {
    return {
      ...fish,
      behaviorStatus: 'cruising',
      behaviorStartedAtMs: nowMs,
      nextBehaviorAtMs: Math.max(fish.nextBehaviorAtMs, nowMs + BEHAVIOR_INTERVAL_MS),
      avoidMouse: null,
    };
  }

  if (fish.behaviorStatus === 'wander' && nowMs >= fish.wanderUntilMs) {
    return {
      ...fish,
      behaviorStatus: 'cruising',
      behaviorStartedAtMs: nowMs,
      nextBehaviorAtMs: nowMs + BEHAVIOR_INTERVAL_MS,
      avoidMouse: null,
    };
  }

  if (nowMs >= fish.nextBehaviorAtMs) {
    return chooseNextBehavior(fish, nowMs, random);
  }

  return {
    ...fish,
    avoidMouse: null,
  };
}
