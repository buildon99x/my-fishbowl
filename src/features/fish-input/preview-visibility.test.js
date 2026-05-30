import { describe, it, expect } from 'vitest';
import { renderFishInputPanel } from './view.js';

// The Create tab serves two flows (draw + upload) in one bottom sheet. The
// separate .preview-area duplicates the live canvas while drawing, so it is
// only rendered for the upload flow (state.source === 'upload'). Hiding it in
// the draw/idle flow removes ~180px of vertical content and is the main fix
// for the "drawing forces scroll" usability problem.

function baseState(overrides = {}) {
  return {
    name: '',
    spriteDataUrl: '',
    status: 'idle',
    message: '',
    source: '',
    type: 'fish',
    movementEnabled: true,
    isExpanded: true,
    sheetStage: 'full',
    activeTab: 'create',
    ...overrides,
  };
}

describe('Create tab preview-area visibility', () => {
  it('hides .preview-area in the idle draw state (source = "")', () => {
    const html = renderFishInputPanel(baseState({ source: '' }));
    expect(html).not.toContain('preview-area');
  });

  it('hides .preview-area while drawing (source = "drawing")', () => {
    const html = renderFishInputPanel(
      baseState({ source: 'drawing', status: 'preview', spriteDataUrl: 'data:image/png;base64,AAA' }),
    );
    expect(html).not.toContain('preview-area');
    // The drawing canvas itself remains present as the live preview.
    expect(html).toContain('fish-drawing-canvas');
  });

  it('shows .preview-area in the upload flow (source = "upload")', () => {
    const html = renderFishInputPanel(
      baseState({ source: 'upload', status: 'preview', spriteDataUrl: 'data:image/png;base64,AAA' }),
    );
    expect(html).toContain('preview-area');
    expect(html).toContain('fish-preview-image');
  });

  it('keeps the drawing canvas present regardless of source', () => {
    for (const source of ['', 'drawing', 'upload']) {
      const html = renderFishInputPanel(baseState({ source }));
      expect(html, `canvas missing for source=${source}`).toContain('data-fish-canvas');
    }
  });
});
