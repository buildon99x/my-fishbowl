import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// CSS sizes are not runtime-measurable in the Node (no-jsdom) test env, so this
// guards the child-area touch-target rules at the CSS-source level. It also
// pins the anti-cascade invariant: --touch-target-min must stay 44 so base.css
// does not enlarge parent-area controls (S-024 high-value subset).

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const tokens = read('./tokens.css');
const components = read('./components.css');
const bottomSheet = read('./components/bottom-sheet.css');
const panels = read('./components/panels.css');

// Extract the first declaration block for a selector (exact selector line).
function block(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  return m ? m[2] : '';
}

describe('child-area touch-target tokens', () => {
  it('defines the child tokens', () => {
    expect(tokens).toMatch(/--touch-target-child:\s*48px/);
    expect(tokens).toMatch(/--touch-target-child-recommended:\s*56px/);
    expect(tokens).toMatch(/--touch-target-child-spacing:\s*12px/);
  });

  it('keeps --touch-target-min at 44px (anti-cascade guard for parent areas)', () => {
    expect(tokens).toMatch(/--touch-target-min:\s*44px/);
  });
});

describe('child-area component sizes', () => {
  it('draw tool buttons use the child-recommended target', () => {
    expect(block(components, '.draw-tool-btn')).toMatch(/child-recommended/);
  });

  it('draw size presets use the child-recommended target', () => {
    expect(block(components, '.draw-size-preset-btn')).toMatch(/child-recommended/);
  });

  it('dock action buttons use a large child touch target (S-037)', () => {
    const propBtn = block(panels, '.prop-btn');
    expect(propBtn).toMatch(/width:\s*68px/);
    expect(propBtn).toMatch(/height:\s*68px/);
  });

  it('bottom-sheet grabber exposes a draggable handle', () => {
    expect(block(bottomSheet, '.bottom-sheet-grabber')).toMatch(/height:\s*32px/);
  });

  it('fish-list rows are at least 64px tall', () => {
    expect(block(components, '.fish-list-item')).toMatch(/min-height:\s*64px/);
  });

  it('fish-list action buttons use the child target', () => {
    expect(block(components, '.fish-action-button')).toMatch(/--touch-target-child\b/);
  });

  it('prop-panel slider is 36px tall', () => {
    expect(block(panels, '.prop-control-range')).toMatch(/height:\s*36px/);
  });
});

describe('color swatch uses a 48px child-recommended visual with an expanded hit area', () => {
  it('visual circle is 48px and the row uses the child spacing (S-038 full-screen)', () => {
    expect(block(components, '.draw-color-btn')).toMatch(/width:\s*48px/);
    expect(block(components, '.draw-color-row')).toMatch(/child-spacing/);
  });

  it('still pads the tap target out via a ::before overlay', () => {
    const before = block(components, '.draw-color-btn::before');
    const hitExpanded = /inset:\s*-6px/.test(before);
    expect(hitExpanded).toBe(true);
  });
});
