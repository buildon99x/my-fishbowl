/**
 * api/_lib/recoveryCode.test.js
 *
 * Unit tests for the recovery-code helper library:
 *   - generateRecoveryCode() format validation
 *   - hashCode() SHA-256 output
 *   - Key-builder functions
 *   - Word distribution (uniqueness)
 */

import { describe, expect, it } from 'vitest';
import {
  buildActiveKey,
  buildLockKey,
  buildRecoveryKey,
  generateRecoveryCode,
  hashCode,
} from './recoveryCode.js';

// ---------------------------------------------------------------------------
// generateRecoveryCode
// ---------------------------------------------------------------------------

describe('generateRecoveryCode', () => {
  it('returns a string matching the word-word-NN format', () => {
    const code = generateRecoveryCode();
    // Must be exactly two hyphen-separated words followed by a 2-digit number
    expect(code).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
  });

  it('zero-pads single-digit numbers (00–09 range)', () => {
    // Run enough times to likely hit a single-digit number
    const codes = Array.from({ length: 200 }, () => generateRecoveryCode());
    const numParts = codes.map((c) => c.split('-')[2]);
    // Every numeric part must be exactly 2 characters
    expect(numParts.every((n) => n.length === 2)).toBe(true);
  });

  it('numeric suffix is between 00 and 99', () => {
    const codes = Array.from({ length: 100 }, () => generateRecoveryCode());
    for (const code of codes) {
      const n = parseInt(code.split('-')[2], 10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(99);
    }
  });

  it('two word parts are different from each other', () => {
    // Run 200 times — with a pool of 200+ words, same-word collisions are
    // intentionally blocked by generateRecoveryCode().
    const codes = Array.from({ length: 200 }, () => generateRecoveryCode());
    for (const code of codes) {
      const parts = code.split('-');
      // parts[0] and parts[1] are words; parts[2] is the number
      expect(parts[0]).not.toBe(parts[1]);
    }
  });

  it('distribution check: 100 codes use a variety of words', () => {
    const codes = Array.from({ length: 100 }, () => generateRecoveryCode());
    const wordSet = new Set();
    for (const code of codes) {
      const [w1, w2] = code.split('-');
      wordSet.add(w1);
      wordSet.add(w2);
    }
    // 100 codes × 2 words each — with a pool of 200+ words we expect
    // well over 20 unique words (generous lower bound).
    expect(wordSet.size).toBeGreaterThan(20);
  });

  it('generates unique codes across repeated calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRecoveryCode()));
    // With millions of combinations, 50 calls should all be unique.
    expect(codes.size).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// hashCode
// ---------------------------------------------------------------------------

describe('hashCode', () => {
  it('returns a 64-character hex string', () => {
    const hash = hashCode('frog-bubble-42');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input always produces same hash', () => {
    const code = 'turtle-mint-07';
    expect(hashCode(code)).toBe(hashCode(code));
  });

  it('two different codes produce different hashes', () => {
    const h1 = hashCode('frog-bubble-42');
    const h2 = hashCode('panda-coral-13');
    expect(h1).not.toBe(h2);
  });

  it('is case-sensitive — upper-case code hashes differently', () => {
    expect(hashCode('frog-bubble-42')).not.toBe(hashCode('FROG-BUBBLE-42'));
  });
});

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

describe('buildRecoveryKey', () => {
  it('prefixes hash with "recovery:"', () => {
    const hash = 'abc123';
    expect(buildRecoveryKey(hash)).toBe('recovery:abc123');
  });
});

describe('buildActiveKey', () => {
  it('prefixes aquariumId with "recovery-active:"', () => {
    expect(buildActiveKey('aq-1')).toBe('recovery-active:aq-1');
  });
});

describe('buildLockKey', () => {
  it('prefixes hash with "recovery-lock:"', () => {
    expect(buildLockKey('deadbeef')).toBe('recovery-lock:deadbeef');
  });
});
