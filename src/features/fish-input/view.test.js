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
