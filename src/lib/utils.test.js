import { describe, expect, it } from 'vitest';
import { clamp, escapeHtml } from './utils.js';

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below the minimum', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" class='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; class=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('coerces non-strings via String()', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
});
