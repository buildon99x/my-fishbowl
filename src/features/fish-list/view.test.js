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
    isFishListCollapsed: false,
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

  it('renders one item with action buttons', () => {
    const html = renderFishList([makeFish()], null, null);
    expect(html).toContain('data-fish-list');
    expect(html).toContain('data-fish-id="f1"');
    expect(html).toContain('data-select-fish="f1"');
    expect(html).toContain('data-toggle-fish-hidden="f1"');
    expect(html).toContain('data-edit-fish="f1"');
    expect(html).toContain('data-delete-fish="f1"');
    expect(html).toContain('감추기');
  });

  it('marks the selected fish', () => {
    const html = renderFishList([makeFish()], 'f1', null);
    expect(html).toContain('is-selected');
    expect(html).toContain('aria-pressed="true"');
  });

  it('marks the editing fish action button as active', () => {
    const html = renderFishList([makeFish()], null, { type: 'fish', id: 'f1' });
    expect(html).toMatch(/fish-action-button is-active[^"]*" type="button" data-edit-fish="f1"/);
  });

  it('shows "보이기" label when fish.hidden is true', () => {
    const html = renderFishList([makeFish({ hidden: true })], null, null);
    expect(html).toContain('보이기');
    expect(html).not.toContain('감추기');
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
    expect(html).toContain('data-toggle-fish-list');
  });

  it('reflects collapsed state in toggle and body', () => {
    const html = renderAquariumStatus(
      makeAquarium(),
      makeAppState({ isFishListCollapsed: true }),
    );
    expect(html).toContain('is-collapsed');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('펼치기');
  });
});
