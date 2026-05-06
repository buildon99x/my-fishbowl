import { describe, expect, it } from 'vitest';
import {
  ALGAE_MAX_LEVEL,
  calcAlgaeLevel,
  calcCleanliness,
  calcLastCleanedAtForAlgaeLevel,
  getAlgaeStateName,
} from './state.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * 60 * 1000;

describe('calcAlgaeLevel', () => {
  it('returns 0 when elapsed time is under 30 minutes', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 29 * MINUTE).toISOString(), now)).toBe(0);
  });

  it('returns 1 exactly at the 30-minute boundary', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 30 * MINUTE).toISOString(), now)).toBe(1);
  });

  it('increments one level every 30 minutes', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 90 * MINUTE).toISOString(), now)).toBe(3);
  });

  it('returns 95 just before the 48-hour maximum', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 48 * HOUR + 1).toISOString(), now)).toBe(95);
  });

  it('returns the maximum level at 48 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 48 * HOUR).toISOString(), now)).toBe(ALGAE_MAX_LEVEL);
  });

  it('does not exceed the maximum level after 48 hours', () => {
    const now = Date.now();
    expect(calcAlgaeLevel(new Date(now - 72 * HOUR).toISOString(), now)).toBe(ALGAE_MAX_LEVEL);
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

  it('supports custom growth settings', () => {
    const now = Date.now();
    expect(
      calcAlgaeLevel(new Date(now - 2 * HOUR).toISOString(), now, {
        intervalMinutes: 15,
        maxHours: 1,
      }),
    ).toBe(4);
  });
});

describe('calcCleanliness', () => {
  it('maps algaeLevel 0 to 100', () => {
    expect(calcCleanliness(0)).toBe(100);
  });

  it('decreases gradually as algae level rises', () => {
    expect(calcCleanliness(ALGAE_MAX_LEVEL / 2)).toBe(55);
  });

  it('maps the maximum algae level to 10', () => {
    expect(calcCleanliness(ALGAE_MAX_LEVEL)).toBe(10);
  });

  it('clamps algae levels above the maximum', () => {
    expect(calcCleanliness(ALGAE_MAX_LEVEL + 10)).toBe(10);
  });
});

describe('getAlgaeStateName', () => {
  it('labels clean and broad algae intensity bands', () => {
    expect(getAlgaeStateName(0)).toBe('clean');
    expect(getAlgaeStateName(1)).toBe('lightAlgae');
    expect(getAlgaeStateName(ALGAE_MAX_LEVEL / 2)).toBe('mediumAlgae');
    expect(getAlgaeStateName(ALGAE_MAX_LEVEL)).toBe('heavyAlgae');
  });
});

describe('calcLastCleanedAtForAlgaeLevel', () => {
  it('returns a timestamp that restores to the requested algae level', () => {
    const now = Date.now();
    const lastCleanedAt = calcLastCleanedAtForAlgaeLevel(37, now);

    expect(calcAlgaeLevel(lastCleanedAt, now)).toBe(37);
  });

  it('clamps requested algae level before calculating timestamp', () => {
    const now = Date.now();
    const lastCleanedAt = calcLastCleanedAtForAlgaeLevel(ALGAE_MAX_LEVEL + 20, now);

    expect(calcAlgaeLevel(lastCleanedAt, now)).toBe(ALGAE_MAX_LEVEL);
  });
});
