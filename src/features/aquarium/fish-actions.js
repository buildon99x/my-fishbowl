import { saveAquarium } from './storage.js';

export function createFishFromDraft(draft, index) {
  const now = new Date().toISOString();
  const lane = index % 5;
  const preferredDepths = ['top', 'middle', 'bottom'];

  return {
    id: crypto.randomUUID(),
    name: draft.name,
    imageUrl: draft.spriteDataUrl,
    x: 28 + lane * 10,
    y: 46 + (lane % 3) * 8,
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
    preferredDepth: preferredDepths[Math.floor(Math.random() * preferredDepths.length)],
    wavingFrequency: 2 + Math.random() * 2,
    wavingAmplitude: 2 + Math.random() * 3,
    behaviorStartedAtMs: 0,
    dartUntilMs: 0,
    wanderUntilMs: 0,
    nextBehaviorAtMs: 0,
    headDirection: 'right',
    movementEnabled: draft.movementEnabled !== false,
    size: 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipped: false,
    flippedY: false,
    hunger: 0,
    hidden: false,
    createdAt: now,
  };
}

export function addFishToAquarium(aquarium, draft) {
  const fish = createFishFromDraft(draft, aquarium.fishes.length);

  aquarium.fishes = [...aquarium.fishes, fish];
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);

  return fish;
}

export function deleteFishFromAquarium(aquarium, fishId) {
  aquarium.fishes = aquarium.fishes.filter((fish) => fish.id !== fishId);
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

export function toggleFishHidden(aquarium, fishId) {
  aquarium.fishes = aquarium.fishes.map((fish) =>
    fish.id === fishId
      ? {
          ...fish,
          hidden: !fish.hidden,
        }
      : fish,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

export function updateFishAppearance(aquarium, fishId, patch) {
  aquarium.fishes = aquarium.fishes.map((fish) =>
    fish.id === fishId
      ? {
          ...fish,
          ...patch,
        }
      : fish,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

export function getFishById(aquarium, fishId) {
  return aquarium.fishes.find((fish) => fish.id === fishId);
}
