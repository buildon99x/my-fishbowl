import { describe, expect, it } from 'vitest';
import { formatRegisteredTime, renderAquariumStatus, renderFishList } from './view.js';

function makeFish(overrides = {}) {
  return {
    id: 'f1',
    name: 'nemo',
    imageUrl: 'data:x',
    createdAt: '2024-05-04T03:02:01.000Z',
    hidden: false,
    ...overrides,
  };
}

function makeAppState(overrides = {}) {
  return {
    selectedFishId: null,
    propPanel: { editingTarget: null },
    ...overrides,
  };
}

function makeAquarium(fishes = []) {
  return {
    fishes,
    cleanliness: 100,
    algaeLevel: 0,
  };
}

describe('formatRegisteredTime', () => {
  it('returns "-" for falsy input', () => {
    expect(formatRegisteredTime(null)).toBe('-');
    expect(formatRegisteredTime('')).toBe('-');
  });

  it('returns "-" for unparseable input', () => {
    expect(formatRegisteredTime('not-a-date')).toBe('-');
  });

  it('formats a valid ISO string', () => {
    const out = formatRegisteredTime('2024-05-04T03:02:01.000Z');
    expect(out).not.toBe('-');
    expect(typeof out).toBe('string');
  });
});

describe('renderFishList', () => {
  it('renders empty state when no fishes', () => {
    expect(renderFishList([], null, null)).toContain('fish-list-empty');
  });

  it('renders one item with row + inline action buttons (no ✏️)', () => {
    const html = renderFishList([makeFish()], null, null);
    expect(html).toContain('data-fish-list');
    expect(html).toContain('data-fish-id="f1"');
    expect(html).toContain('data-select-fish="f1"');
    expect(html).toContain('data-toggle-fish-hidden="f1"');
    expect(html).toContain('data-delete-fish="f1"');
    // ✏️ edit button removed (S-035: row tap == edit)
    expect(html).not.toContain('data-edit-fish');
  });

  it('marks the selected fish', () => {
    const html = renderFishList([makeFish()], 'f1', null);
    expect(html).toContain('is-selected');
  });

  it('marks the editing fish row as active', () => {
    const html = renderFishList([makeFish()], null, { type: 'fish', id: 'f1' });
    expect(html).toContain('is-selected');
    expect(html).toContain('aria-pressed="true"');
  });

  it('swaps hide icon when fish.hidden is true', () => {
    const visible = renderFishList([makeFish()], null, null);
    const hidden = renderFishList([makeFish({ hidden: true })], null, null);
    expect(visible).toContain('🙈');
    expect(hidden).toContain('👁');
  });

  it('escapes name and createdAt', () => {
    const html = renderFishList(
      [makeFish({ name: '<script>', createdAt: '"x"' })],
      null,
      null,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;x&quot;');
  });
});

describe('renderAquariumStatus', () => {
  it('renders status counts and algae state', () => {
    const html = renderAquariumStatus(
      makeAquarium([makeFish()]),
      makeAppState(),
    );
    expect(html).toContain('1개');
    expect(html).toContain('오브젝트 목록');
    expect(html).toContain('100%');
    expect(html).toContain('이끼 단계');
  });

  it('no longer renders the collapse toggle (S-035)', () => {
    const html = renderAquariumStatus(makeAquarium(), makeAppState());
    expect(html).not.toContain('data-toggle-fish-list');
    expect(html).not.toContain('aria-expanded');
  });
});
