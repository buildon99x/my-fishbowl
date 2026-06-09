import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderFishInputPanel } from './view.js';

// S-038 UX-completeness guards. The drawing canvas/pointer wiring is browser-only
// (no jsdom here), so these pin the Node-checkable contracts behind the
// end-to-end "open → draw → feedback → exit" journey: coach-mark visibility, the
// validity of every sound id the feature plays, and the full-screen exit target.

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

function createState(overrides = {}) {
  return {
    name: '', spriteDataUrl: '', status: 'idle', message: '', source: '',
    type: 'fish', movementEnabled: true, hasContent: false,
    isExpanded: true, sheetStage: 'full', coachmarkSeen: false, ...overrides,
  };
}

describe('first-run coach-mark visibility', () => {
  it('shows the coach-mark on a fresh, unseen, empty canvas', () => {
    const html = renderFishInputPanel(createState());
    expect(html).toContain('data-create-coachmark');
  });

  it('hides the coach-mark once it has been seen', () => {
    const html = renderFishInputPanel(createState({ coachmarkSeen: true }));
    expect(html).not.toContain('data-create-coachmark');
  });

  it('hides the coach-mark once there is content (a drawn/uploaded sprite)', () => {
    const html = renderFishInputPanel(
      createState({ spriteDataUrl: 'data:image/png;base64,AAA', status: 'preview', source: 'drawing' }),
    );
    expect(html).not.toContain('data-create-coachmark');
  });
});

describe('feedback sound ids are real (no silent taps)', () => {
  // Extract the synth-recipe ids the audio engine can always produce (the
  // guaranteed fallback, independent of whether an .ogg asset is present).
  const audioSrc = read('../sound/audio.js');
  const recipeBlock = audioSrc.slice(
    audioSrc.indexOf('const SYNTH_RECIPES'),
    audioSrc.indexOf('};', audioSrc.indexOf('const SYNTH_RECIPES')),
  );
  const recipeIds = new Set([...recipeBlock.matchAll(/'([a-z]+\.[a-z0-9-]+)'/g)].map((m) => m[1]));

  // Every sound-id-shaped literal the feature plays.
  const indexSrc = read('./index.js');
  const usedIds = [...indexSrc.matchAll(/'((?:ui|magic|interaction|ambient)\.[a-z0-9-]+)'/g)].map((m) => m[1]);

  it('plays at least the ui.tap selection sound', () => {
    expect(usedIds).toContain('ui.tap');
  });

  it('every sound id used in fish-input exists in the audio engine', () => {
    const missing = usedIds.filter((id) => !recipeIds.has(id));
    expect(missing, `Unknown sound ids: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('full-screen exit target', () => {
  const css = read('../../styles/components/create-window.css');

  it('raises the close (×) button to the child-recommended touch target', () => {
    const block = css.slice(css.indexOf('.create-window-topbar-actions .prop-action-btn'));
    expect(block).toMatch(/min-height:\s*var\(--touch-target-child-recommended\)/);
  });
});
