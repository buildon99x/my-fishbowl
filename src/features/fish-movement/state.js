import { createFishLiveliness, resolveBehaviorState } from './fishBehavior.js';
import {
  applyTurn,
  beginTurn,
  createDartVectorAwayFromMouse,
  createTargetVector,
  getMovementTiltDegrees,
  shouldStartTurn,
} from './fishPhysics.js';
import { clamp } from '../../lib/utils.js';

export const MOVEMENT_BOUNDS = {
  minX: 4,
  maxX: 96,
  minY: 8,
  maxY: 92,
};

const DEFAULT_SPEED = 6;
const MIN_SPEED = 3.4;
const MAX_SPEED = 8.8;
const MIN_TARGET_INTERVAL_MS = 2600;
const MAX_TARGET_INTERVAL_MS = 5600;
const MAX_FRAME_MS = 80;
const MIN_WALL_PAUSE_MS = 500;
const MAX_WALL_PAUSE_MS = 5000;

export function normalizeHeadDirection(value) {
  return value === 'left' ? 'left' : 'right';
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
  const liveliness = createFishLiveliness(fish, nowMs, random);

  return {
    x: Number.isFinite(fish?.x) ? fish.x : 28 + (index % 5) * 10,
    y: Number.isFinite(fish?.y) ? fish.y : 46 + (index % 3) * 8,
    vx: Number.isFinite(fish?.vx) && fish.vx !== 0 ? fish.vx : vector.vx,
    vy: Number.isFinite(fish?.vy) ? fish.vy : vector.vy,
    speed: Number.isFinite(fish?.speed) && fish.speed > 0 ? clamp(fish.speed, MIN_SPEED, MAX_SPEED) : vector.speed,
    movementStatus: liveliness.behaviorStatus,
    turnUntilMs: Number.isFinite(fish?.turnUntilMs) ? fish.turnUntilMs : 0,
    turnStartedAtMs: Number.isFinite(fish?.turnStartedAtMs) ? fish.turnStartedAtMs : 0,
    turnFromVx: Number.isFinite(fish?.turnFromVx) ? fish.turnFromVx : 0,
    turnFromVy: Number.isFinite(fish?.turnFromVy) ? fish.turnFromVy : 0,
    turnTargetVx: Number.isFinite(fish?.turnTargetVx) ? fish.turnTargetVx : 0,
    turnTargetVy: Number.isFinite(fish?.turnTargetVy) ? fish.turnTargetVy : 0,
    turnReturnStatus: fish?.turnReturnStatus ?? 'cruising',
    wallPauseUntilMs: Number.isFinite(fish?.wallPauseUntilMs) ? fish.wallPauseUntilMs : 0,
    wallResumeVx: Number.isFinite(fish?.wallResumeVx) ? fish.wallResumeVx : 0,
    wallResumeVy: Number.isFinite(fish?.wallResumeVy) ? fish.wallResumeVy : 0,
    nextTargetAtMs: Number.isFinite(fish?.nextTargetAtMs)
      ? fish.nextTargetAtMs
      : nowMs + getRandomInRange(random, MIN_TARGET_INTERVAL_MS, MAX_TARGET_INTERVAL_MS),
    bobPhase: Number.isFinite(fish?.bobPhase) ? fish.bobPhase : random() * Math.PI * 2,
    waveOffset: Number.isFinite(fish?.waveOffset) ? fish.waveOffset : 0,
    movementTilt: Number.isFinite(fish?.movementTilt) ? fish.movementTilt : 0,
    ...liveliness,
  };
}

export function normalizeFishMovement(fish, index = 0, nowMs = 0, random = Math.random) {
  const movement = createFishMovementState(fish, index, nowMs, random);

  return {
    ...fish,
    ...movement,
    headDirection: normalizeHeadDirection(fish?.headDirection),
    movementEnabled: fish?.movementEnabled !== false,
  };
}

export function shouldFlipFishForMovement(fish) {
  const headDirection = normalizeHeadDirection(fish?.headDirection);
  const movingLeft = Number.isFinite(fish?.vx) && fish.vx < 0;
  const movementFlip = headDirection === 'right' ? movingLeft : !movingLeft;

  return movementFlip !== Boolean(fish?.flipped);
}

export function stepFishMovement(fish, elapsedMs, nowMs, options = {}) {
  const random = options.random ?? Math.random;
  const bounds = options.bounds ?? MOVEMENT_BOUNDS;
  let movement = createFishMovementState(fish, options.index ?? 0, nowMs, random);
  const dt = Math.min(Math.max(elapsedMs, 0), options.maxFrameMs ?? MAX_FRAME_MS) / 1000;
  let { x, y, vx, vy, speed } = movement;
  let nextTargetAtMs = movement.nextTargetAtMs;
  let behaviorStatus;
  let movementStatus;
  const bobPhase = movement.bobPhase;
  let didResumeFromWallPause = false;
  const previousBehaviorStatus = movement.behaviorStatus;

  if (movement.wallPauseUntilMs > nowMs) {
    return {
      ...fish,
      ...movement,
      vx: 0,
      vy: 0,
      movementStatus: 'idle',
      behaviorStatus: 'idle',
      waveOffset: 0,
      movementTilt: 0,
      avoidMouse: null,
    };
  }

  if (movement.wallPauseUntilMs > 0 && nowMs >= movement.wallPauseUntilMs) {
    vx = movement.wallResumeVx || -Math.sign(vx || 1) * speed;
    vy = movement.wallResumeVy;
    movement = {
      ...movement,
      vx,
      vy,
      behaviorStatus: 'cruising',
      movementStatus: 'cruising',
      wallPauseUntilMs: 0,
      wallResumeVx: 0,
      wallResumeVy: 0,
      nextTargetAtMs: nowMs + getRandomInRange(random, MIN_TARGET_INTERVAL_MS, MAX_TARGET_INTERVAL_MS),
    };
    nextTargetAtMs = movement.nextTargetAtMs;
    didResumeFromWallPause = true;
  }

  if (!didResumeFromWallPause) {
    movement = resolveBehaviorState(movement, nowMs, random, options.mouseState);
  }
  behaviorStatus = movement.behaviorStatus;
  movementStatus = behaviorStatus;
  const justEnteredWander = behaviorStatus === 'wander' && previousBehaviorStatus !== 'wander';
  const shouldRefreshTarget = nowMs >= nextTargetAtMs || behaviorStatus === 'idle' || justEnteredWander;

  if (!didResumeFromWallPause && movement.avoidMouse) {
    const dartVector = createDartVectorAwayFromMouse(movement, movement.avoidMouse);

    vx = dartVector.vx;
    vy = dartVector.vy;
    speed = dartVector.speed;
    movementStatus = 'dart';
  } else if (!didResumeFromWallPause && behaviorStatus === 'dart') {
    const length = Math.hypot(vx, vy) || 1;
    const dartSpeed = speed * movement.speedMultiplier * 2.1;

    vx = (vx / length) * dartSpeed;
    vy = (vy / length) * dartSpeed;
    speed = dartSpeed;
    movementStatus = 'dart';
  } else if (!didResumeFromWallPause && behaviorStatus === 'turning') {
    movement = applyTurn({ ...movement, x, y, vx, vy, speed }, nowMs);
    vx = movement.vx;
    vy = movement.vy;
    behaviorStatus = movement.behaviorStatus;
    movementStatus = movement.movementStatus;
  } else if (!didResumeFromWallPause && shouldRefreshTarget) {
    const nextVector = behaviorStatus === 'idle'
      ? createTargetVector({ ...movement, x, y, vx, vy, speed, behaviorStatus }, random)
      : createTargetVector({
          ...movement,
          x,
          y,
          vx,
          vy,
          speed: getRandomInRange(random, MIN_SPEED, MAX_SPEED),
          behaviorStatus,
        }, random);

    if (behaviorStatus !== 'idle' && shouldStartTurn({ ...movement, vx, vy }, nextVector)) {
      movement = beginTurn({ ...movement, x, y, vx, vy, speed, behaviorStatus }, nextVector, nowMs, behaviorStatus);
      movement = applyTurn(movement, nowMs);
      vx = movement.vx;
      vy = movement.vy;
      behaviorStatus = movement.behaviorStatus;
      movementStatus = movement.movementStatus;
    } else {
      vx = nextVector.vx;
      vy = nextVector.vy;
      speed = nextVector.speed;
    }

    nextTargetAtMs = nowMs + getRandomInRange(random, MIN_TARGET_INTERVAL_MS, MAX_TARGET_INTERVAL_MS);
  }

  x += vx * dt;
  y += vy * dt;

  if ((x <= bounds.minX && vx < 0) || (x >= bounds.maxX && vx > 0)) {
    x = clamp(x, bounds.minX, bounds.maxX);
    vx = 0;
    vy = 0;
    behaviorStatus = 'idle';
    movementStatus = 'idle';
    movement = {
      ...movement,
      wallPauseUntilMs: nowMs + getRandomInRange(random, MIN_WALL_PAUSE_MS, MAX_WALL_PAUSE_MS),
      wallResumeVx: x <= bounds.minX ? Math.abs(speed) : -Math.abs(speed),
      wallResumeVy: getRandomInRange(random, -speed * 0.28, speed * 0.28),
    };
  }

  if ((y <= bounds.minY && vy < 0) || (y >= bounds.maxY && vy > 0)) {
    y = clamp(y, bounds.minY, bounds.maxY);
    vx = 0;
    vy = 0;
    behaviorStatus = 'idle';
    movementStatus = 'idle';
    movement = {
      ...movement,
      wallPauseUntilMs: nowMs + getRandomInRange(random, MIN_WALL_PAUSE_MS, MAX_WALL_PAUSE_MS),
      wallResumeVx: getRandomInRange(random, -speed, speed) || speed,
      wallResumeVy: y <= bounds.minY ? Math.abs(speed * 0.55) : -Math.abs(speed * 0.55),
    };
  }

  return {
    ...fish,
    ...movement,
    x,
    y,
    vx,
    vy,
    speed,
    behaviorStatus,
    movementStatus,
    nextTargetAtMs,
    bobPhase,
    waveOffset: 0,
    movementTilt: getMovementTiltDegrees({ vx, vy }),
    avoidMouse: null,
  };
}

export function stepFishesMovement(fishes, elapsedMs, nowMs, options = {}) {
  if (!Array.isArray(fishes) || fishes.length === 0) {
    return [];
  }

  const pausedFishIds = options.pausedFishIds ?? new Set();

  return fishes.map((fish, index) => {
    if (fish.hidden || fish.movementEnabled === false || pausedFishIds.has(fish.id)) {
      return fish;
    }

    return stepFishMovement(fish, elapsedMs, nowMs, {
      ...options,
      mouseState: options.mouseState,
      index,
    });
  });
}
