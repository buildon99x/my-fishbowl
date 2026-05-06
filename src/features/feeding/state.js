import { FOOD_CONFIGS, DEFAULT_FOOD_TYPE } from './foodConfig.js';
import { tickFoodPhysics, isFoodExpired } from './foodPhysics.js';
import { applyFoodEffect, getFoodDetectRadius } from './foodEffects.js';
import { clamp } from '../../lib/utils.js';

export const FOOD_EAT_DISTANCE = 6;

export function createFeedingState() {
  return {
    feedingMode: false,
    selectedType: DEFAULT_FOOD_TYPE,
    foods: [],
    fishEating: null,
    lastTickAt: 0,
  };
}

export function createFoodAt(x, y, type = DEFAULT_FOOD_TYPE) {
  const config = FOOD_CONFIGS[type] ?? FOOD_CONFIGS.pellet;
  const [minSpeed, maxSpeed] = config.fallSpeedRange;
  const asset = config.assets[Math.floor(Math.random() * config.assets.length)];

  return {
    id: crypto.randomUUID(),
    type,
    asset,
    x,
    y,
    baseX: x,
    fallSpeed: minSpeed + Math.random() * (maxSpeed - minSpeed),
    rotation: Math.random() * 360,
    rotationSpeed: config.rotates ? 60 + Math.random() * 240 : 0,
    elapsedMs: 0,
    createdAt: Date.now(),
    landedAt: null,
  };
}

export function createFoodsAt(x, y, type = DEFAULT_FOOD_TYPE) {
  const config = FOOD_CONFIGS[type] ?? FOOD_CONFIGS.pellet;
  const [minCount, maxCount] = config.countPerClick;
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));

  return Array.from({ length: count }, () => {
    const spawnX = type === 'flake' ? x + (Math.random() * 40 - 20) : x;
    return createFoodAt(Math.min(Math.max(spawnX, 2), 98), y, type);
  });
}

export function addFoods(state, foods) {
  state.foods = [...state.foods, ...foods];
  return foods;
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveFishTowardFood(fish, food, deltaSeconds, attractDistance) {
  const dx = food.x - fish.x;
  const dy = food.y - fish.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || distance > attractDistance) {
    return fish;
  }

  const step = Math.min(distance, 18 * deltaSeconds);
  const x = clamp(fish.x + (dx / distance) * step, 4, 96);
  const y = clamp(fish.y + (dy / distance) * step, 6, 94);

  return {
    ...fish,
    x,
    y,
    flipped: dx < -0.2 ? true : dx > 0.2 ? false : fish.flipped,
  };
}

function feedFish(fish, foodType, nowMs) {
  const config = FOOD_CONFIGS[foodType] ?? FOOD_CONFIGS.pellet;
  const fed = {
    ...fish,
    hunger: clamp((Number(fish.hunger) || 0) - config.hungerReduction, 0, 100),
  };
  return applyFoodEffect(fed, foodType, nowMs);
}

export function tickFeeding(state, fishes, nowMs) {
  const previousTickAt = state.lastTickAt || nowMs;
  const deltaSeconds = Math.min((nowMs - previousTickAt) / 1000, 0.05);

  const updatedFoods = state.foods
    .map((food) => tickFoodPhysics(food, deltaSeconds))
    .filter((food) => food.y <= 96 && !isFoodExpired(food, nowMs));

  let updatedFishes = fishes;
  let eatenFoodId = null;
  let fishEating = null;

  updatedFoods.forEach((food) => {
    const nearest = updatedFishes
      .filter((fish) => !fish.hidden)
      .map((fish) => ({
        fish,
        distance: getDistance(fish, food),
        attractDistance: getFoodDetectRadius(fish, nowMs),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearest || nearest.distance > nearest.attractDistance) {
      return;
    }

    updatedFishes = updatedFishes.map((fish) =>
      fish.id === nearest.fish.id
        ? moveFishTowardFood(fish, food, deltaSeconds, nearest.attractDistance)
        : fish,
    );

    const movedFish = updatedFishes.find((fish) => fish.id === nearest.fish.id);

    if (movedFish && getDistance(movedFish, food) <= FOOD_EAT_DISTANCE && !eatenFoodId) {
      eatenFoodId = food.id;
      fishEating = movedFish.id;
      updatedFishes = updatedFishes.map((fish) =>
        fish.id === movedFish.id ? feedFish(fish, food.type, nowMs) : fish,
      );
    }
  });

  state.foods = eatenFoodId
    ? updatedFoods.filter((food) => food.id !== eatenFoodId)
    : updatedFoods;
  state.fishEating = fishEating;
  state.lastTickAt = nowMs;

  return {
    fishes: updatedFishes,
    didEat: Boolean(eatenFoodId),
    didChange: state.foods.length > 0 || Boolean(eatenFoodId),
  };
}
