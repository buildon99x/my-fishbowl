import { describe, expect, it } from 'vitest';
import { ALGAE_MAX_LEVEL } from './state.js';
import { getAlgaeRenderConfig } from './view.js';

describe('getAlgaeRenderConfig', () => {
  it('increases density and opacity by 30% at max algae level', () => {
    const cfg = getAlgaeRenderConfig(ALGAE_MAX_LEVEL);

    expect(cfg.count).toBeCloseTo(28 * 1.3);
    expect(cfg.countJitter).toBeCloseTo(5 * 1.3);
    expect(cfg.opacityMin).toBeCloseTo(0.52 * 1.3);
    expect(cfg.opacityMax).toBeCloseTo(0.72 * 1.3);
  });
});
