import { describe, it, expect } from 'vitest';
import {
  createMagicMomentState,
  dequeueMagicMoment,
  enqueueMagicMoment,
  isMagicActive,
  MAGIC_PHASE_DURATIONS,
  MAGIC_QUEUE_MAX,
} from './state.js';

describe('magic-moment state', () => {
  it('starts idle', () => {
    const s = createMagicMomentState();
    expect(s.phase).toBe('idle');
    expect(isMagicActive(s)).toBe(false);
    expect(s.queue.length).toBe(0);
  });

  it('queue caps at MAGIC_QUEUE_MAX', () => {
    const s = createMagicMomentState();
    for (let i = 0; i < MAGIC_QUEUE_MAX; i++) {
      expect(enqueueMagicMoment(s, { fishId: `f${i}` })).toBe(true);
    }
    expect(enqueueMagicMoment(s, { fishId: 'overflow' })).toBe(false);
    expect(s.queue.length).toBe(MAGIC_QUEUE_MAX);
  });

  it('dequeue returns FIFO', () => {
    const s = createMagicMomentState();
    enqueueMagicMoment(s, { fishId: 'a' });
    enqueueMagicMoment(s, { fishId: 'b' });
    expect(dequeueMagicMoment(s).fishId).toBe('a');
    expect(dequeueMagicMoment(s).fishId).toBe('b');
    expect(dequeueMagicMoment(s)).toBeNull();
  });

  it('phase durations sum to ~2800ms', () => {
    const total = MAGIC_PHASE_DURATIONS.anticipating
      + MAGIC_PHASE_DURATIONS.transforming
      + MAGIC_PHASE_DURATIONS.welcoming
      + MAGIC_PHASE_DURATIONS.breath;
    expect(total).toBe(2800);
  });
});
