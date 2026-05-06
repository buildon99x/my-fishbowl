export const FOOD_TYPE = 'basic';
export const MAX_FOOD_AGE_MS = 14000;
export const FOOD_EAT_DISTANCE = 6;
export const FOOD_ATTRACT_DISTANCE = 26;
export const FISH_FEED_STEP = 18;

export function createFeedingState() {
  return {
    feedingMode: false,
    selectedType: FOOD_TYPE,
    foods: [],
    fishEating: null,
    lastTickAt: 0,
  };
}

export function createFoodAt(x, y, type = FOOD_TYPE) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    fallSpeed: 10 + Math.random() * 4,
    createdAt: now,
  };
}

export function addFood(state, food) {
  state.foods = [...state.foods, food];
  return food;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveFishTowardFood(fish, food, deltaSeconds) {
  const dx = food.x - fish.x;
  const dy = food.y - fish.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || distance > FOOD_ATTRACT_DISTANCE) {
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

function feedFish(fish) {
  return {
    ...fish,
    hunger: clamp((Number(fish.hunger) || 0) - FISH_FEED_STEP, 0, 100),
  };
}

export function tickFeeding(state, fishes, nowMs) {
  const previousTickAt = state.lastTickAt || nowMs;
  const deltaSeconds = Math.min((nowMs - previousTickAt) / 1000, 0.05);
  const createdAtMs = (food) => Date.parse(food.createdAt) || nowMs;
  const updatedFoods = state.foods
    .map((food) => ({
      ...food,
      y: food.y + food.fallSpeed * deltaSeconds,
    }))
    .filter((food) => food.y <= 96 && nowMs - createdAtMs(food) < MAX_FOOD_AGE_MS);
  let updatedFishes = fishes;
  let eatenFoodId = null;
  let fishEating = null;

  updatedFoods.forEach((food) => {
    const nearestFish = updatedFishes
      .filter((fish) => !fish.hidden)
      .map((fish) => ({ fish, distance: getDistance(fish, food) }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearestFish || nearestFish.distance > FOOD_ATTRACT_DISTANCE) {
      return;
    }

    updatedFishes = updatedFishes.map((fish) =>
      fish.id === nearestFish.fish.id ? moveFishTowardFood(fish, food, deltaSeconds) : fish,
    );

    const movedFish = updatedFishes.find((fish) => fish.id === nearestFish.fish.id);

    if (movedFish && getDistance(movedFish, food) <= FOOD_EAT_DISTANCE && !eatenFoodId) {
      eatenFoodId = food.id;
      fishEating = movedFish.id;
      updatedFishes = updatedFishes.map((fish) =>
        fish.id === movedFish.id ? feedFish(fish) : fish,
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
