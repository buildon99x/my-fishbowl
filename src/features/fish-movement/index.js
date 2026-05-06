import { normalizeFishMovement, shouldFlipFishForMovement, stepFishesMovement } from './state.js';
import { trackAquariumMouse } from './mouseInteraction.js';

const SAVE_INTERVAL_MS = 2000;

function applyFishMotion(root, fish) {
  const sprite = root.querySelector(`[data-fish-sprite="${CSS.escape(fish.id)}"]`);

  if (!sprite) {
    return;
  }

  sprite.style.setProperty('--fish-x', `${fish.x}%`);
  sprite.style.setProperty('--fish-y', `${fish.y}%`);
  sprite.style.setProperty('--fish-bob-y', `${fish.waveOffset ?? 0}px`);
  sprite.style.setProperty('--fish-tilt', `${fish.movementTilt ?? 0}deg`);
  sprite.style.setProperty('--fish-flip', shouldFlipFishForMovement(fish) ? '-1' : '1');
  sprite.dataset.movementStatus = fish.movementStatus ?? 'cruising';
}

export function normalizeAquariumFishMovement(aquarium, nowMs = 0) {
  aquarium.fishes = aquarium.fishes.map((fish, index) => normalizeFishMovement(fish, index, nowMs));
}

export function startFishMovement(root, aquarium, options = {}) {
  const mouseTracker = trackAquariumMouse(root);
  let frameId = 0;
  let lastFrameMs = performance.now();
  let lastSavedMs = lastFrameMs;

  function tick(nowMs) {
    const pausedFishIds = options.getPausedFishIds?.() ?? new Set();

    aquarium.fishes = stepFishesMovement(aquarium.fishes, nowMs - lastFrameMs, nowMs, {
      mouseState: mouseTracker.getState(),
      pausedFishIds,
    });
    lastFrameMs = nowMs;

    aquarium.fishes.forEach((fish) => {
      if (!fish.hidden && fish.movementEnabled !== false && !pausedFishIds.has(fish.id)) {
        applyFishMotion(root, fish);
      }
    });

    if (nowMs - lastSavedMs >= SAVE_INTERVAL_MS) {
      options.onSave?.();
      lastSavedMs = nowMs;
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(frameId);
      mouseTracker.stop();
    },
  };
}

export { shouldFlipFishForMovement, stepFishMovement, stepFishesMovement } from './state.js';
