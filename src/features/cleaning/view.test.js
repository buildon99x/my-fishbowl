import { describe, it, expect } from 'vitest';
import { renderCleaningOverlay } from './view.js';

// The scrub hint guides a pre-literate child on what to do in cleaning mode.
// t() returns the key when i18n is uninitialized (Node test env), so we assert
// against the key — the locale JSON holds the human copy and is guarded by the
// ko/en identical-key-set check.

describe('cleaning overlay scrub hint', () => {
  it('renders the scrub hint while not yet cleaned', () => {
    const html = renderCleaningOverlay({ cleaned: false, cleaningProgress: 0 });
    expect(html).toContain('data-cleaning-hint');
    expect(html).toContain('cleaning.hint');
  });

  it('drops the hint once cleaning is complete', () => {
    const html = renderCleaningOverlay({ cleaned: true, cleaningProgress: 1 });
    expect(html).not.toContain('data-cleaning-hint');
    expect(html).toContain('cleaning.done');
  });
});
