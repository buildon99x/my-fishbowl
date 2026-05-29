import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub globals before module import
vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('localStorage', (() => {
  const store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
})());
vi.stubGlobal('navigator', { language: 'ko-KR' });
vi.stubGlobal('document', { documentElement: { setAttribute: vi.fn() } });

import { t, getSupportedLangs } from './i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('t() returns key when translations not loaded', () => {
    expect(t('missing.key')).toBe('missing.key');
  });

  it('t() returns key unchanged when key has no placeholders', () => {
    expect(t('some.key')).toBe('some.key');
  });

  it('getSupportedLangs returns ko and en', () => {
    const langs = getSupportedLangs();
    expect(langs).toContain('ko');
    expect(langs).toContain('en');
    expect(langs).toHaveLength(2);
  });

  it('getSupportedLangs returns a new array each call', () => {
    const a = getSupportedLangs();
    const b = getSupportedLangs();
    expect(a).not.toBe(b);
  });
});
