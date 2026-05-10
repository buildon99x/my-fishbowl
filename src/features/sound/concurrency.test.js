import { describe, it, expect } from 'vitest';
import {
  createConcurrencyState,
  registerActive,
  releaseActive,
  shouldRateLimit,
  SOUND_CONFIG,
} from './concurrency.js';

describe('sound concurrency', () => {
  it('rate-limits identical triggers within 100ms', () => {
    const s = createConcurrencyState();
    expect(shouldRateLimit(s, 'ui.tap', 0)).toBe(false);
    expect(shouldRateLimit(s, 'ui.tap', 50)).toBe(true);
    expect(shouldRateLimit(s, 'ui.tap', 200)).toBe(false);
  });

  it('does not rate-limit different sounds', () => {
    const s = createConcurrencyState();
    expect(shouldRateLimit(s, 'ui.tap', 0)).toBe(false);
    expect(shouldRateLimit(s, 'ui.toggle', 10)).toBe(false);
  });

  it('evicts oldest non-magic when at MAX_CONCURRENT', () => {
    const s = createConcurrencyState();
    for (let i = 0; i < SOUND_CONFIG.MAX_CONCURRENT; i++) {
      const r = registerActive(s, { id: `ui.${i}`, category: 'ui' });
      expect(r.accepted).toBe(true);
      expect(r.evicted).toBeNull();
    }
    const r = registerActive(s, { id: 'ui.x', category: 'ui' });
    expect(r.accepted).toBe(true);
    expect(r.evicted).toEqual({ id: 'ui.0', category: 'ui' });
    expect(s.active.length).toBe(SOUND_CONFIG.MAX_CONCURRENT);
  });

  it('protects magic from cutoff and lets new magic exceed cap', () => {
    const s = createConcurrencyState();
    for (let i = 0; i < SOUND_CONFIG.MAX_CONCURRENT; i++) {
      registerActive(s, { id: `magic.${i}`, category: 'magic' });
    }
    const r = registerActive(s, { id: 'magic.x', category: 'magic' });
    expect(r.accepted).toBe(true);
    expect(r.evicted).toBeNull();
  });

  it('rejects new non-magic when active is all magic at cap', () => {
    const s = createConcurrencyState();
    for (let i = 0; i < SOUND_CONFIG.MAX_CONCURRENT; i++) {
      registerActive(s, { id: `magic.${i}`, category: 'magic' });
    }
    const r = registerActive(s, { id: 'ui.x', category: 'ui' });
    expect(r.accepted).toBe(false);
    expect(r.evicted).toBeNull();
    expect(s.active.length).toBe(SOUND_CONFIG.MAX_CONCURRENT);
  });

  it('releaseActive removes entry', () => {
    const s = createConcurrencyState();
    const e = { id: 'ui.tap', category: 'ui' };
    registerActive(s, e);
    releaseActive(s, e);
    expect(s.active.length).toBe(0);
  });
});
