import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPRITE_WIDTH, SPRITE_HEIGHT } from '../../lib/spriteResize.js';
import { renderFishInputPanel } from './view.js';

// Canvas/pointer mechanics are browser-only (no jsdom here) and are covered by
// extracted pure functions in draw-logic.test.js + the manual dev checklist.
// These tests guard the contracts that ARE checkable in Node.

describe('sprite resolution contract', () => {
  it('keeps the 3:2 aspect ratio', () => {
    expect(SPRITE_WIDTH / SPRITE_HEIGHT).toBe(720 / 480);
  });

  it('is raised to 480x320 for crisp uploads', () => {
    expect(SPRITE_WIDTH).toBe(480);
    expect(SPRITE_HEIGHT).toBe(320);
  });
});

function createState(overrides = {}) {
  return {
    name: '', spriteDataUrl: '', status: 'idle', message: '', source: '',
    type: 'fish', movementEnabled: true, hasContent: false,
    isExpanded: true, sheetStage: 'full', activeTab: 'create', ...overrides,
  };
}

describe('redo button', () => {
  it('renders a disabled redo control in the create-tab toolbar', () => {
    const html = renderFishInputPanel(createState());
    expect(html).toContain('data-draw-redo');
    // disabled at first render (nothing to redo)
    expect(html).toMatch(/data-draw-redo[^>]*disabled/);
  });
});

describe('no hardcoded Hangul in fish-input runtime messages', () => {
  it('index.js builds user-facing messages via t(), not literals', () => {
    const src = readFileSync(fileURLToPath(new URL('./index.js', import.meta.url)), 'utf8');
    // Strip line comments so Korean explanatory comments do not trip the guard.
    const codeOnly = src.replace(/\/\/.*$/gm, '');
    const hangulInStrings = codeOnly.match(/(['"`])[^'"`]*[가-힣][^'"`]*\1/g) || [];
    expect(hangulInStrings).toEqual([]);
  });

  it('view.js has no hardcoded Hangul in aria-label or alt attributes', () => {
    const src = readFileSync(fileURLToPath(new URL('./view.js', import.meta.url)), 'utf8');
    // Strip line and block comments before checking.
    const noLineComments = src.replace(/\/\/.*$/gm, '');
    const noBlockComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    // Any aria-label/alt="..." containing Hangul characters is a violation.
    const hardcoded = noBlockComments.match(/(?:aria-label|alt)="[^"]*[가-힣][^"]*"/g) || [];
    expect(hardcoded).toEqual([]);
  });
});
