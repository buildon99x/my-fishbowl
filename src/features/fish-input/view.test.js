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
