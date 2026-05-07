const DEFAULT_DETECT_RADIUS = 26;
const BLOODWORM_DETECT_RADIUS = 38;
const BLOODWORM_DETECT_DURATION_MS = 10000;
const BLOODWORM_DART_DURATION_MS = 15000;

export function applyFoodEffect(fish, foodType, nowMs) {
  if (foodType === 'bloodworm') {
    return {
      ...fish,
      foodDetectRadiusUntilMs: nowMs + BLOODWORM_DETECT_DURATION_MS,
      dartBoostUntilMs: nowMs + BLOODWORM_DART_DURATION_MS,
    };
  }
  return fish;
}

export function getFoodDetectRadius(fish, nowMs) {
  if (fish.foodDetectRadiusUntilMs && nowMs < fish.foodDetectRadiusUntilMs) {
    return BLOODWORM_DETECT_RADIUS;
  }
  return DEFAULT_DETECT_RADIUS;
}
