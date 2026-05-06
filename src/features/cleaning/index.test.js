import { describe, expect, it } from 'vitest';
import { calculateCleaningProgress, clearAlgaeCanvas } from './index.js';

function imageDataFromAlphas(alphas) {
  const data = new Uint8ClampedArray(alphas.length * 4);
  alphas.forEach((alpha, index) => {
    data[index * 4 + 3] = alpha;
  });
  return { data };
}

describe('calculateCleaningProgress', () => {
  it('uses visible algae pixel coverage instead of alpha weight', () => {
    const initialVisiblePixels = 10;
    const current = imageDataFromAlphas([0, 0, 0, 0, 20, 20, 20, 20, 20, 20]);

    expect(calculateCleaningProgress(initialVisiblePixels, current)).toBe(0.4);
  });

  it('treats a canvas without initial algae as complete', () => {
    const current = imageDataFromAlphas([0, 0, 0]);

    expect(calculateCleaningProgress(0, current)).toBe(1);
  });
});

describe('clearAlgaeCanvas', () => {
  it('clears the whole algae canvas when cleaning completes', () => {
    const calls = [];
    const canvas = {
      width: 320,
      height: 180,
      getContext: () => ({
        clearRect: (...args) => calls.push(args),
      }),
    };

    clearAlgaeCanvas(canvas);

    expect(calls).toEqual([[0, 0, 320, 180]]);
  });
});
