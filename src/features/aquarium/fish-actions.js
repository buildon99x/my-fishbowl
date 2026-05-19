import { jitterPropPosition, DEFAULT_FISH_DEFAULTS, DEFAULT_DECO_DEFAULTS } from './model.js';
import { saveAquarium } from './storage/index.js';

export const PENDING_DELETE_TIMEOUT_MS = 5000;

function patchFish(aquarium, id, patch) {
  aquarium.fishes = aquarium.fishes.map((fish) =>
    fish.id === id ? { ...fish, ...patch } : fish,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

const PREFERRED_DEPTHS = ['top', 'middle', 'bottom'];

function fishDefaults() {
  return {
    vx: 0,
    vy: 0,
    speed: 0,
    movementStatus: 'cruising',
    behaviorStatus: 'cruising',
    turnUntilMs: 0,
    turnStartedAtMs: 0,
    turnFromVx: 0,
    turnFromVy: 0,
    turnTargetVx: 0,
    turnTargetVy: 0,
    turnReturnStatus: 'cruising',
    wallPauseUntilMs: 0,
    wallResumeVx: 0,
    wallResumeVy: 0,
    nextTargetAtMs: 0,
    bobPhase: 0,
    waveOffset: 0,
    movementTilt: 0,
    speedMultiplier: 0.7 + Math.random() * 0.6,
    idleBias: Math.random() * 0.4,
    preferredDepth: PREFERRED_DEPTHS[Math.floor(Math.random() * PREFERRED_DEPTHS.length)],
    wavingFrequency: 2 + Math.random() * 2,
    wavingAmplitude: 2 + Math.random() * 3,
    behaviorStartedAtMs: 0,
    dartUntilMs: 0,
    wanderUntilMs: 0,
    nextBehaviorAtMs: 0,
    headDirection: 'right',
    hunger: 0,
  };
}

export function createFishFromDraft(draft, index, options = {}) {
  const now = new Date().toISOString();
  const type = draft?.type === 'deco' ? 'deco' : 'fish';
  const lane = index % 5;
  const baseX = type === 'deco'
    ? DEFAULT_DECO_DEFAULTS.x
    : DEFAULT_FISH_DEFAULTS.x + lane * 10;
  const baseY = type === 'deco'
    ? DEFAULT_DECO_DEFAULTS.y
    : DEFAULT_FISH_DEFAULTS.y + (lane % 3) * 8;
  const pos = options.aquarium
    ? jitterPropPosition(options.aquarium, baseX, baseY)
    : { x: baseX, y: baseY };

  return {
    id: crypto.randomUUID(),
    type,
    name: draft.name,
    imageUrl: draft.spriteDataUrl,
    x: pos.x,
    y: pos.y,
    ...fishDefaults(),
    movementEnabled: type === 'deco' ? false : draft.movementEnabled !== false,
    size: type === 'deco' ? DEFAULT_DECO_DEFAULTS.size : DEFAULT_FISH_DEFAULTS.size,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipped: false,
    flippedY: false,
    hidden: false,
    pendingDelete: false,
    pendingDeleteAt: null,
    createdAt: now,
  };
}

export function addUserPropToAquarium(aquarium, draft) {
  const prop = createFishFromDraft(draft, aquarium.fishes.length, { aquarium });

  aquarium.fishes = [...aquarium.fishes, prop];
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);

  return prop;
}

export function deleteFishFromAquarium(aquarium, fishId) {
  aquarium.fishes = aquarium.fishes.filter((fish) => fish.id !== fishId);
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

export function softDeleteProp(aquarium, propId) {
  patchFish(aquarium, propId, { pendingDelete: true, pendingDeleteAt: new Date().toISOString() });
}

export function restoreProp(aquarium, propId) {
  patchFish(aquarium, propId, { pendingDelete: false, pendingDeleteAt: null });
}

export function commitPendingDelete(aquarium, propId) {
  const target = aquarium.fishes.find((fish) => fish.id === propId);
  if (!target || !target.pendingDelete) return;
  aquarium.fishes = aquarium.fishes.filter((fish) => fish.id !== propId);
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

export function toggleFishHidden(aquarium, fishId) {
  const fish = aquarium.fishes.find((f) => f.id === fishId);
  if (!fish) return;
  patchFish(aquarium, fishId, { hidden: !fish.hidden });
}

export function updateFishAppearance(aquarium, fishId, patch) {
  patchFish(aquarium, fishId, patch);
}

export function updatePropType(aquarium, propId, nextType) {
  const type = nextType === 'deco' ? 'deco' : 'fish';
  let changed = false;
  aquarium.fishes = aquarium.fishes.map((fish) => {
    if (fish.id !== propId) return fish;
    if (fish.type === type) return fish;
    changed = true;
    if (type === 'deco') {
      const preservedMovementEnabled = fish.movementEnabled !== false;
      return {
        ...fish,
        type: 'deco',
        movementEnabled: false,
        movementEnabledBeforeDeco: preservedMovementEnabled,
      };
    }
    const restored = {
      ...fish,
      type: 'fish',
      movementEnabled: fish.movementEnabledBeforeDeco !== false,
      movementEnabledBeforeDeco: undefined,
      headDirection: fish.headDirection === 'left' ? 'left' : 'right',
      hunger: Number.isFinite(fish.hunger) ? fish.hunger : 0,
      vx: Number.isFinite(fish.vx) ? fish.vx : 0,
      vy: Number.isFinite(fish.vy) ? fish.vy : 0,
      speed: Number.isFinite(fish.speed) && fish.speed > 0 ? fish.speed : 0,
      movementStatus: fish.movementStatus ?? 'cruising',
      behaviorStatus: fish.behaviorStatus ?? 'cruising',
    };
    return restored;
  });
  if (changed) {
    aquarium.updatedAt = new Date().toISOString();
    saveAquarium(aquarium);
  }
  return changed;
}

export function getFishById(aquarium, fishId) {
  return aquarium.fishes.find((fish) => fish.id === fishId);
}
