export const MOVEMENT_BOUNDS = {
  minX: 4,
  maxX: 96,
  minY: 8,
  maxY: 92,
};

const DEFAULT_SPEED = 6;
const MIN_SPEED = 3.4;
const MAX_SPEED = 8.8;
const TURN_DURATION_MS = 520;
const MIN_TARGET_INTERVAL_MS = 2600;
const MAX_TARGET_INTERVAL_MS = 5600;
const MAX_FRAME_MS = 80;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRandomInRange(random, min, max) {
  return min + random() * (max - min);
}

function createMovementVector(random, directionX = 1, speed = DEFAULT_SPEED) {
  const angle = getRandomInRange(random, -0.28, 0.28);
  const normalizedSpeed = clamp(speed, MIN_SPEED, MAX_SPEED);

  return {
    vx: Math.cos(angle) * normalizedSpeed * Math.sign(directionX || 1),
    vy: Math.sin(angle) * normalizedSpeed * 0.72,
    speed: normalizedSpeed,
  };
}

export function createFishMovementState(fish, index = 0, nowMs = 0, random = Math.random) {
  const directionX = Number.isFinite(fish?.vx) && fish.vx !== 0
    ? Math.sign(fish.vx)
    : index % 2 === 0
      ? 1
      : -1;
  const vector = createMovementVector(random, directionX, Number.isFinite(fish?.speed) ? fish.speed : DEFAULT_SPEED);

  return {
    x: Number.isFinite(fish?.x) ? fish.x : 28 + (index % 5) * 10,
    y: Number.isFinite(fish?.y) ? fish.y : 46 + (index % 3) * 8,
    vx: Number.isFinite(fish?.vx) && fish.vx !== 0 ? fish.vx : vector.vx,
    vy: Number.isFinite(fish?.vy) ? fish.vy : vector.vy,
    speed: Number.isFinite(fish?.speed) && fish.speed > 0 ? clamp(fish.speed, MIN_SPEED, MAX_SPEED) : vector.speed,
    movementStatus: fish?.movementStatus === 'turning' ? 'turning' : 'swimming',
    turnUntilMs: Number.isFinite(fish?.turnUntilMs) ? fish.turnUntilMs : 0,
    nextTargetAtMs: Number.isFinite(fish?.nextTargetAtMs)
      ? fish.nextTargetAtMs
      : nowMs + getRandomInRange(random, MIN_TARGET_INTERVAL_MS, MAX_TARGET_INTERVAL_MS),
    bobPhase: Number.isFinite(fish?.bobPhase) ? fish.bobPhase : random() * Math.PI * 2,
  };
}

export function normalizeFishMovement(fish, index = 0, nowMs = 0, random = Math.random) {
  const movement = createFishMovementState(fish, index, nowMs, random);

  return {
    ...fish,
    ...movement,
    flipped: movement.vx < 0,
  };
}

export function stepFishMovement(fish, elapsedMs, nowMs, options = {}) {
  const random = options.random ?? Math.random;
  const bounds = options.bounds ?? MOVEMENT_BOUNDS;
  const movement = createFishMovementState(fish, options.index ?? 0, nowMs, random);
  const dt = Math.min(Math.max(elapsedMs, 0), options.maxFrameMs ?? MAX_FRAME_MS) / 1000;
  let { x, y, vx, vy, speed } = movement;
  let movementStatus = nowMs < movement.turnUntilMs ? 'turning' : 'swimming';
  let turnUntilMs = movement.turnUntilMs;
  let nextTargetAtMs = movement.nextTargetAtMs;
  const bobPhase = movement.bobPhase + dt * speed * 0.7;
  const bob = Math.sin(bobPhase) * 0.34;

  if (nowMs >= nextTargetAtMs) {
    const nextVector = createMovementVector(random, Math.sign(vx || 1), getRandomInRange(random, MIN_SPEED, MAX_SPEED));

    vx = nextVector.vx;
    vy = nextVector.vy;
    speed = nextVector.speed;
    nextTargetAtMs = nowMs + getRandomInRange(random, MIN_TARGET_INTERVAL_MS, MAX_TARGET_INTERVAL_MS);
  }

  x += vx * dt;
  y += (vy + bob) * dt;

  if (x <= bounds.minX || x >= bounds.maxX) {
    x = clamp(x, bounds.minX, bounds.maxX);
    vx = -vx;
    movementStatus = 'turning';
    turnUntilMs = nowMs + TURN_DURATION_MS;
  }

  if (y <= bounds.minY || y >= bounds.maxY) {
    y = clamp(y, bounds.minY, bounds.maxY);
    vy = -vy;
    movementStatus = 'turning';
    turnUntilMs = nowMs + TURN_DURATION_MS;
  }

  return {
    ...fish,
    x,
    y,
    vx,
    vy,
    speed,
    movementStatus,
    turnUntilMs,
    nextTargetAtMs,
    bobPhase,
    flipped: vx < 0,
  };
}

export function stepFishesMovement(fishes, elapsedMs, nowMs, options = {}) {
  if (!Array.isArray(fishes) || fishes.length === 0) {
    return [];
  }

  const pausedFishIds = options.pausedFishIds ?? new Set();

  return fishes.map((fish, index) => {
    if (fish.hidden || pausedFishIds.has(fish.id)) {
      return fish;
    }

    return stepFishMovement(fish, elapsedMs, nowMs, {
      ...options,
      index,
    });
  });
}
