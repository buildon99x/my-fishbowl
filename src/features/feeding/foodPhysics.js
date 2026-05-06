import { FOOD_CONFIGS } from './foodConfig.js';

const SWAY_PERIOD_MS = 1200;

export function tickFoodPhysics(food, deltaSeconds) {
  const config = FOOD_CONFIGS[food.type] ?? FOOD_CONFIGS.pellet;
  const elapsedMs = (food.elapsedMs ?? 0) + deltaSeconds * 1000;

  let x = food.x;
  if (config.swayAmplitude > 0) {
    x = (food.baseX ?? food.x) + Math.sin((elapsedMs / SWAY_PERIOD_MS) * 2 * Math.PI) * config.swayAmplitude;
  }

  const rotation = config.rotates
    ? ((food.rotation ?? 0) + (food.rotationSpeed ?? 0) * deltaSeconds) % 360
    : food.rotation ?? 0;

  const newY = food.y + food.fallSpeed * deltaSeconds;
  const landedAt = food.landedAt === null && newY >= 95 ? Date.now() : food.landedAt;

  return { ...food, x, y: newY, rotation, elapsedMs, landedAt };
}

export function isFoodExpired(food, nowMs) {
  const config = FOOD_CONFIGS[food.type] ?? FOOD_CONFIGS.pellet;
  if (food.landedAt !== null) {
    return nowMs - food.landedAt > config.landedTtl;
  }
  return nowMs - food.createdAt > 30000;
}
