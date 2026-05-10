import { describe, expect, it } from 'vitest';
import { DEFAULT_OBJECTS_MANIFEST } from '../../assets/default-objects/manifest.js';
import { getNextNameWithSuffix } from './catalog.js';

describe('default-objects manifest', () => {
  it('has fish 6 + deco 5 entries', () => {
    const fish = DEFAULT_OBJECTS_MANIFEST.filter((e) => e.type === 'fish');
    const deco = DEFAULT_OBJECTS_MANIFEST.filter((e) => e.type === 'deco');
    expect(fish).toHaveLength(6);
    expect(deco).toHaveLength(5);
  });

  it('classifies deco-* ids as type "deco" and others as type "fish"', () => {
    DEFAULT_OBJECTS_MANIFEST.forEach((entry) => {
      if (entry.id.startsWith('deco-')) {
        expect(entry.type).toBe('deco');
      } else {
        expect(entry.type).toBe('fish');
      }
    });
  });

  it('has unique ids', () => {
    const ids = DEFAULT_OBJECTS_MANIFEST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deco entries have defaultMovementEnabled === false', () => {
    DEFAULT_OBJECTS_MANIFEST
      .filter((e) => e.type === 'deco')
      .forEach((e) => {
        expect(e.defaultMovementEnabled).toBe(false);
      });
  });

  it('every entry has a non-empty spriteUrl, name and defaultSize', () => {
    DEFAULT_OBJECTS_MANIFEST.forEach((entry) => {
      expect(entry.spriteUrl).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(typeof entry.defaultSize).toBe('number');
    });
  });
});

describe('getNextNameWithSuffix', () => {
  it('returns base name when not used', () => {
    expect(getNextNameWithSuffix(['Other'], 'Nimo')).toBe('Nimo');
  });

  it('appends (2) on first collision', () => {
    expect(getNextNameWithSuffix(['Nimo'], 'Nimo')).toBe('Nimo (2)');
  });

  it('appends (3) when (2) is taken', () => {
    expect(getNextNameWithSuffix(['Nimo', 'Nimo (2)'], 'Nimo')).toBe('Nimo (3)');
  });
});
