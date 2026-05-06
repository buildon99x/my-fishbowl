import { shouldFlipFishForMovement } from '../features/fish-movement/index.js';

export function getFishSpriteStyleVars(fish) {
  return {
    '--fish-x': `${fish.x}%`,
    '--fish-y': `${fish.y}%`,
    '--fish-size': `${fish.size}px`,
    '--fish-scale-x': fish.scaleX,
    '--fish-scale-y': fish.scaleY,
    '--fish-rotation': `${fish.rotation}deg`,
    '--fish-tilt': `${fish.movementTilt ?? 0}deg`,
    '--fish-bob-y': `${fish.waveOffset ?? 0}px`,
    '--fish-flip': shouldFlipFishForMovement(fish) ? -1 : 1,
    '--fish-flip-y': fish.flippedY ? -1 : 1,
  };
}

export function cssVarsToInlineStyle(vars) {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}
