import { clamp } from '../../lib/utils.js';

export const TURN_DURATION_MS = 500;
export const MAX_TILT_DEGREES = 15;

function getRandomInRange(random, min, max) {
  return min + random() * (max - min);
}

function getVectorLength(vx, vy) {
  return Math.hypot(vx, vy);
}

function normalizeVector(vx, vy, fallbackX = 1) {
  const length = getVectorLength(vx, vy);

  if (length === 0) {
    return { x: Math.sign(fallbackX || 1), y: 0 };
  }

  return {
    x: vx / length,
    y: vy / length,
  };
}

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function depthTargetFor(preferredDepth) {
  if (preferredDepth === 'top') {
    return 27;
  }
  if (preferredDepth === 'bottom') {
    return 73;
  }
  return 50;
}

export function createTargetVector(fish, random = Math.random) {
  const direction = Math.sign(fish.vx || 1);
  const speed = fish.speed * fish.speedMultiplier;
  const depthTarget = depthTargetFor(fish.preferredDepth);
  const depthPull = clamp((depthTarget - fish.y) / 120, -0.22, 0.22);

  if (fish.behaviorStatus === 'idle') {
    return { vx: 0, vy: 0, speed: speed * 0.12 };
  }

  if (fish.behaviorStatus === 'wander') {
    const angle = getRandomInRange(random, -1.05, 1.05);

    return {
      vx: Math.cos(angle) * direction * speed * 0.72,
      vy: (Math.sin(angle) * 0.82 + depthPull) * speed * 0.72,
      speed: speed * 0.72,
    };
  }

  const angle = getRandomInRange(random, -0.32, 0.32);

  return {
    vx: Math.cos(angle) * direction * speed,
    vy: (Math.sin(angle) * 0.65 + depthPull) * speed,
    speed,
  };
}

export function createDartVectorAwayFromMouse(fish, mouseState) {
  const away = normalizeVector(
    fish.x - mouseState.x,
    ((fish.y - mouseState.y) * mouseState.heightPx) / mouseState.widthPx,
    fish.vx,
  );
  const speed = fish.speed * fish.speedMultiplier * 2.4;

  return {
    vx: away.x * speed,
    vy: away.y * speed,
    speed,
  };
}

export function beginTurn(fish, targetVector, nowMs, returnStatus = fish.behaviorStatus) {
  return {
    ...fish,
    behaviorStatus: 'turning',
    movementStatus: 'turning',
    turnStartedAtMs: nowMs,
    turnUntilMs: nowMs + TURN_DURATION_MS,
    turnFromVx: fish.vx,
    turnFromVy: fish.vy,
    turnTargetVx: targetVector.vx,
    turnTargetVy: targetVector.vy,
    turnReturnStatus: returnStatus === 'turning' || returnStatus === 'dart' ? 'cruising' : returnStatus,
  };
}

export function applyTurn(fish, nowMs) {
  if (fish.behaviorStatus !== 'turning') {
    return fish;
  }

  if (nowMs >= fish.turnUntilMs) {
    return {
      ...fish,
      vx: fish.turnTargetVx,
      vy: fish.turnTargetVy,
      behaviorStatus: fish.turnReturnStatus ?? 'cruising',
      movementStatus: fish.turnReturnStatus ?? 'cruising',
    };
  }

  const progress = smoothStep((nowMs - fish.turnStartedAtMs) / TURN_DURATION_MS);

  return {
    ...fish,
    vx: fish.turnFromVx + (fish.turnTargetVx - fish.turnFromVx) * progress,
    vy: fish.turnFromVy + (fish.turnTargetVy - fish.turnFromVy) * progress,
    movementStatus: 'turning',
  };
}

export function shouldStartTurn(fish, targetVector) {
  const current = normalizeVector(fish.vx, fish.vy);
  const target = normalizeVector(targetVector.vx, targetVector.vy);
  const dot = current.x * target.x + current.y * target.y;

  return dot < 0.985;
}

export function getMovementTiltDegrees(fish) {
  const horizontal = Math.abs(fish.vx);
  const vertical = fish.vy;
  const ratio = horizontal + Math.abs(vertical) === 0 ? 0 : vertical / (horizontal + Math.abs(vertical));

  return clamp(ratio * MAX_TILT_DEGREES, -MAX_TILT_DEGREES, MAX_TILT_DEGREES);
}
