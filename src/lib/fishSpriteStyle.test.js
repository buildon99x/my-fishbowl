import { describe, expect, it } from 'vitest';
import { cssVarsToInlineStyle, getFishSpriteStyleVars } from './fishSpriteStyle.js';

function makeFish(overrides = {}) {
  return {
    x: 50,
    y: 30,
    size: 80,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    movementTilt: 0,
    waveOffset: 0,
    flippedY: false,
    headDirection: 'right',
    vx: 4,
    flipped: false,
    ...overrides,
  };
}

describe('getFishSpriteStyleVars', () => {
  it('returns CSS variable map keyed by custom property names', () => {
    const vars = getFishSpriteStyleVars(makeFish({ x: 10, y: 20, size: 64 }));
    expect(vars['--fish-x']).toBe('10%');
    expect(vars['--fish-y']).toBe('20%');
    expect(vars['--fish-size']).toBe('64px');
  });

  it('serializes scale, rotation, tilt, and bob with correct units', () => {
    const vars = getFishSpriteStyleVars(
      makeFish({ scaleX: 0.8, scaleY: 1.2, rotation: 30, movementTilt: 12, waveOffset: 4 }),
    );
    expect(vars['--fish-scale-x']).toBe(0.8);
    expect(vars['--fish-scale-y']).toBe(1.2);
    expect(vars['--fish-rotation']).toBe('30deg');
    expect(vars['--fish-tilt']).toBe('12deg');
    expect(vars['--fish-bob-y']).toBe('4px');
  });

  it('defaults missing tilt and waveOffset to 0', () => {
    const vars = getFishSpriteStyleVars(makeFish({ movementTilt: undefined, waveOffset: undefined }));
    expect(vars['--fish-tilt']).toBe('0deg');
    expect(vars['--fish-bob-y']).toBe('0px');
  });

  it('flips horizontally when movement direction opposes head direction', () => {
    const right = getFishSpriteStyleVars(makeFish({ headDirection: 'right', vx: 4 }));
    const flipped = getFishSpriteStyleVars(makeFish({ headDirection: 'right', vx: -4 }));
    expect(right['--fish-flip']).toBe(1);
    expect(flipped['--fish-flip']).toBe(-1);
  });

  it('uses flippedY for vertical flip', () => {
    expect(getFishSpriteStyleVars(makeFish({ flippedY: false }))['--fish-flip-y']).toBe(1);
    expect(getFishSpriteStyleVars(makeFish({ flippedY: true }))['--fish-flip-y']).toBe(-1);
  });
});

describe('cssVarsToInlineStyle', () => {
  it('joins entries as "key: value;" pairs', () => {
    const out = cssVarsToInlineStyle({ '--fish-x': '10%', '--fish-size': '64px' });
    expect(out).toBe('--fish-x: 10%; --fish-size: 64px;');
  });

  it('returns empty string for empty input', () => {
    expect(cssVarsToInlineStyle({})).toBe('');
  });
});
