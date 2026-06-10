import { describe, it, expect } from 'vitest';
import { renderFishInputPanel } from './view.js';

function createState(overrides = {}) {
  return {
    name: '', spriteDataUrl: '', status: 'idle', message: '', source: '',
    type: 'fish', movementEnabled: true, hasContent: false,
    isExpanded: true, sheetStage: 'full', activeTab: 'create', ...overrides,
  };
}

describe('add-sheet markup', () => {
  it('marks the sheet as a child touch area (S-024 region marker)', () => {
    expect(renderFishInputPanel(createState())).toContain('data-touch-area="child"');
  });

  it('renders the color swatches the hit-area CSS depends on', () => {
    const html = renderFishInputPanel(createState());
    expect(html).toContain('class="draw-color-btn');
    expect(html).toContain('--swatch-color');
  });
});

describe('toolbar reflects persisted drawing selection', () => {
  // Each button's class+attrs are emitted together, so assert the active marker
  // sits on the persisted tool/size/color — proving selection survives re-render.
  it('marks the persisted tool active (eraser, not the pen default)', () => {
    const html = renderFishInputPanel(createState({ drawTool: 'eraser' }));
    expect(html).toMatch(/draw-tool-btn is-active"[^>]*data-draw-tool="eraser"/);
    expect(html).toMatch(/data-draw-tool="pen" aria-pressed="false"/);
  });

  it('marks the persisted brush size active (thick, not the thin default)', () => {
    const html = renderFishInputPanel(createState({ drawSize: 22 }));
    expect(html).toMatch(/draw-size-preset-btn is-active"[^>]*data-draw-size-preset="22"/);
  });

  it('marks the persisted color active (red, not the black default)', () => {
    const html = renderFishInputPanel(createState({ drawColor: '#ef4444' }));
    expect(html).toMatch(/draw-color-btn is-active"[^>]*data-color="#ef4444"/);
    // The black swatch must NOT be active when red is selected.
    expect(html).toMatch(/draw-color-btn "[^>]*data-color="#1a1a1a"[^>]*aria-pressed="false"/);
  });

  it('defaults to pen/thin/black when selection is unset', () => {
    const html = renderFishInputPanel(createState());
    expect(html).toMatch(/draw-tool-btn is-active"[^>]*data-draw-tool="pen"/);
    expect(html).toMatch(/draw-size-preset-btn is-active"[^>]*data-draw-size-preset="8"/);
    expect(html).toMatch(/draw-color-btn is-active"[^>]*data-color="#1a1a1a"/);
  });
});

describe('symmetry + stamp markup (S-036)', () => {
  it('renders the stamp tool button and the symmetry toggle', () => {
    const html = renderFishInputPanel(createState());
    expect(html).toMatch(/data-draw-tool="stamp"/);
    expect(html).toContain('data-draw-symmetry');
  });

  it('renders all six shape buttons', () => {
    const html = renderFishInputPanel(createState());
    ['circle', 'heart', 'star', 'eye', 'drop', 'triangle'].forEach((shape) => {
      expect(html).toContain(`data-draw-shape="${shape}"`);
    });
  });

  it('hides the shape row until the stamp tool is active', () => {
    expect(renderFishInputPanel(createState())).toMatch(/draw-shape-row "/);
    expect(renderFishInputPanel(createState({ drawTool: 'stamp' })))
      .toMatch(/draw-shape-row is-visible"/);
  });

  it('marks the symmetry toggle and guide active only when symmetry is on', () => {
    const off = renderFishInputPanel(createState());
    expect(off).toMatch(/draw-symmetry-btn "[^>]*data-draw-symmetry[^>]*aria-pressed="false"/);
    expect(off).toMatch(/draw-symmetry-guide "/);
    const on = renderFishInputPanel(createState({ symmetry: true }));
    expect(on).toMatch(/draw-symmetry-btn is-active"[^>]*aria-pressed="true"/);
    expect(on).toMatch(/draw-symmetry-guide is-visible"/);
  });

  it('marks the persisted shape active', () => {
    const html = renderFishInputPanel(createState({ drawTool: 'stamp', drawShape: 'heart' }));
    expect(html).toMatch(/draw-shape-btn is-active"[^>]*data-draw-shape="heart"/);
  });
});
