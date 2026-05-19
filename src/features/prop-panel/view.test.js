import { describe, expect, it } from 'vitest';
import { renderPropPanel } from './view.js';

function makeFish(overrides = {}) {
  return {
    id: 'f1',
    name: 'nemo',
    imageUrl: 'data:x',
    type: 'fish',
    size: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipped: false,
    flippedY: false,
    headDirection: 'right',
    movementEnabled: true,
    ...overrides,
  };
}

function makeAquarium(fishes = []) {
  return { fishes };
}

describe('renderPropPanel (S-034: right side sheet)', () => {
  it('returns empty string when no editing target', () => {
    expect(renderPropPanel(null, makeAquarium(), {})).toBe('');
  });

  it('renders the panel shell for a fish target', () => {
    const html = renderPropPanel(
      { id: 'f1', type: 'fish' },
      makeAquarium([makeFish()]),
      {},
    );
    expect(html).toContain('class="prop-panel"');
    expect(html).toContain('role="complementary"');
    expect(html).toContain('nemo');
  });

  it('does not inject inline position style (drag deprecated in S-034)', () => {
    const html = renderPropPanel(
      { id: 'f1', type: 'fish' },
      makeAquarium([makeFish()]),
      { position: { x: 100, y: 200 } },
    );
    // The panel container must not carry a per-instance style="left:..."
    // attribute — positioning is owned entirely by CSS now.
    expect(html).not.toMatch(/<div class="prop-panel"[^>]*style=/);
    expect(html).not.toContain('left:100px');
    expect(html).not.toContain('top:200px');
  });
});
