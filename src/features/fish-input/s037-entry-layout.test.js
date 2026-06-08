import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// S-037: the entry-routing handlers and the create-tab layout are browser/DOM
// concerns the Node (no-jsdom) test env can't exercise at runtime, so — matching
// the repo's CSS-source guard pattern (styles/touch-target.test.js) — these pin
// the invariants at the source level. They guard the two CRITICAL findings from
// the spec review: (C1) entry must land on the drawing canvas, and (C2/M3) the
// canvas must have a height floor / the sheet body must be the growing row.

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

function block(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return m ? m[2] : '';
}

describe('S-037 entry routes straight to the drawing canvas (C1)', () => {
  it('the ➕ add button opens the create tab at full height', () => {
    const src = read('../prop-panel/index.js');
    const handler = src.slice(src.indexOf('data-prop-add-fish'));
    expect(handler).toMatch(/activeTab\s*=\s*'create'/);
    expect(handler).toMatch(/sheetStage\s*=\s*next\s*\?\s*'full'/);
  });

  it('the onboarding seq1 CTA also opens the create tab at full height', () => {
    // seq2 attaches its outline to [data-fish-canvas], which only exists in the
    // create tab — so the CTA must route there (and to full, not cropped peek).
    const src = read('../onboarding/index.js');
    const cta = src.slice(src.indexOf('cta?.addEventListener'));
    expect(cta).toMatch(/activeTab\s*=\s*'create'/);
    expect(cta).toMatch(/sheetStage\s*=\s*'full'/);
  });
});

describe('S-037 create-tab layout invariants (C2 / M3)', () => {
  const bottomSheet = read('../../styles/components/bottom-sheet.css');
  const components = read('../../styles/components.css');

  it('the sheet uses 5 row tracks so the body (4th child) is the growing 1fr row', () => {
    expect(block(bottomSheet, '.fish-input-widget.bottom-sheet'))
      .toMatch(/grid-template-rows:\s*auto auto auto 1fr auto/);
  });

  it('the create tab stays full height regardless of sheet stage (no peek clip)', () => {
    expect(bottomSheet).toMatch(/\.fish-input-widget\.bottom-sheet\[data-active-tab="create"\]/);
  });

  it('the create-tab body is a flex column with a scroll fallback', () => {
    expect(bottomSheet).toMatch(/\[data-active-tab="create"\]\s*\.bottom-sheet-body/);
    // overflow-y:auto + overscroll-behavior:contain live on the shared
    // .bottom-sheet-body rule (the fallback recovery path).
    expect(block(bottomSheet, '.bottom-sheet-body')).toMatch(/overflow-y:\s*auto/);
    expect(block(bottomSheet, '.bottom-sheet-body')).toMatch(/overscroll-behavior:\s*contain/);
  });

  it('the canvas wrap has a min-height floor so it never collapses to ~0', () => {
    expect(block(components, '.draw-canvas-wrap')).toMatch(/min-height:\s*min\(/);
    expect(block(components, '.draw-canvas-wrap')).toMatch(/flex:\s*1 1 auto/);
  });

  it('the draw area flexes to fill the remaining sheet height', () => {
    expect(block(components, '.draw-area')).toMatch(/flex:\s*1 1 auto/);
  });
});
