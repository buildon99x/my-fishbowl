import { describe, expect, it } from 'vitest';
import { calcAlgaeLevel, calcCleanliness } from './state.js';

const HOUR = 60 * 60 * 1000;

describe('calcAlgaeLevel', () => {
  it('returns 0 when elapsed time is under 12 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 11 * HOUR).toISOString(), now)).toBe(0);
  });

  it('returns 1 when elapsed time is between 12 and 24 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 13 * HOUR).toISOString(), now)).toBe(1);
  });

  it('returns 2 when elapsed time is between 24 and 48 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 36 * HOUR).toISOString(), now)).toBe(2);
  });

  it('returns 3 when elapsed time exceeds 48 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 49 * HOUR).toISOString(), now)).toBe(3);
  });

  it('returns 0 when lastCleanedAt is null', () => {
    expect(calcAlgaeLevel(null, Date.now())).toBe(0);
  });

  it('returns 0 when lastCleanedAt is an invalid date string', () => {
    expect(calcAlgaeLevel('not-a-date', Date.now())).toBe(0);
  });

  it('returns 0 when lastCleanedAt is in the future', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now + 1 * HOUR).toISOString(), now)).toBe(0);
  });

  it('returns 0 exactly at the 12-hour boundary', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 12 * HOUR + 1).toISOString(), now)).toBe(0);
  });

  it('returns 1 exactly at the 12-hour boundary', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 12 * HOUR).toISOString(), now)).toBe(1);
  });
});

describe('calcCleanliness', () => {
  it('maps algaeLevel 0 to 100', () => {
    expect(calcCleanliness(0)).toBe(100);
  });

  it('maps algaeLevel 1 to 70', () => {
    expect(calcCleanliness(1)).toBe(70);
  });

  it('maps algaeLevel 2 to 40', () => {
    expect(calcCleanliness(2)).toBe(40);
  });

  it('maps algaeLevel 3 to 10', () => {
    expect(calcCleanliness(3)).toBe(10);
  });
});
