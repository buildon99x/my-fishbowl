export const DEFAULT_BOUNDS = {
  shape: 'rounded-bowl',
  width: 1152,
  height: 780,
  padding: 66,
};

export function createAquarium() {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: '나만의 어항',
    fishes: [],
    cleanliness: 100,
    algaeLevel: 0,
    bounds: { ...DEFAULT_BOUNDS },
    lastCleanedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeAquarium(aquarium) {
  const fallback = createAquarium();
  const fishes = Array.isArray(aquarium?.fishes)
    ? aquarium.fishes.map((fish) => ({
        ...fish,
        hidden: Boolean(fish?.hidden),
        vx: Number.isFinite(fish?.vx) ? fish.vx : 0,
        vy: Number.isFinite(fish?.vy) ? fish.vy : 0,
        speed: Number.isFinite(fish?.speed) ? fish.speed : 0,
        movementStatus: ['cruising', 'idle', 'dart', 'wander', 'turning'].includes(fish?.movementStatus)
          ? fish.movementStatus
          : 'cruising',
        behaviorStatus: ['cruising', 'idle', 'dart', 'wander', 'turning'].includes(fish?.behaviorStatus)
          ? fish.behaviorStatus
          : 'cruising',
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
        nextTargetAtMs: Number.isFinite(fish?.nextTargetAtMs) ? fish.nextTargetAtMs : 0,
        bobPhase: Number.isFinite(fish?.bobPhase) ? fish.bobPhase : 0,
        waveOffset: Number.isFinite(fish?.waveOffset) ? fish.waveOffset : 0,
        movementTilt: Number.isFinite(fish?.movementTilt) ? fish.movementTilt : 0,
        speedMultiplier: Number.isFinite(fish?.speedMultiplier) && fish.speedMultiplier > 0 ? fish.speedMultiplier : null,
        idleBias: Number.isFinite(fish?.idleBias) ? fish.idleBias : null,
        preferredDepth: ['top', 'middle', 'bottom'].includes(fish?.preferredDepth) ? fish.preferredDepth : null,
        wavingFrequency: Number.isFinite(fish?.wavingFrequency) && fish.wavingFrequency > 0 ? fish.wavingFrequency : null,
        wavingAmplitude: Number.isFinite(fish?.wavingAmplitude) && fish.wavingAmplitude > 0 ? fish.wavingAmplitude : null,
        behaviorStartedAtMs: Number.isFinite(fish?.behaviorStartedAtMs) ? fish.behaviorStartedAtMs : 0,
        dartUntilMs: Number.isFinite(fish?.dartUntilMs) ? fish.dartUntilMs : 0,
        wanderUntilMs: Number.isFinite(fish?.wanderUntilMs) ? fish.wanderUntilMs : 0,
        nextBehaviorAtMs: Number.isFinite(fish?.nextBehaviorAtMs) ? fish.nextBehaviorAtMs : 0,
        headDirection: fish?.headDirection === 'left' ? 'left' : 'right',
        movementEnabled: fish?.movementEnabled !== false,
        size: Number.isFinite(fish?.size) ? fish.size : 120,
        rotation: Number.isFinite(fish?.rotation) ? fish.rotation : 0,
        scaleX: Number.isFinite(fish?.scaleX)
          ? fish.scaleX
          : Number.isFinite(fish?.shapeScaleX)
            ? fish.shapeScaleX
            : 1,
        scaleY: Number.isFinite(fish?.scaleY) ? fish.scaleY : 1,
        flipped: Boolean(fish?.flipped),
        flippedY: Boolean(fish?.flippedY),
        hunger: Number.isFinite(fish?.hunger) ? fish.hunger : 0,
      }))
    : [];

  return {
    ...fallback,
    ...aquarium,
    fishes,
    bounds: {
      ...DEFAULT_BOUNDS,
      ...aquarium?.bounds,
    },
  };
}
