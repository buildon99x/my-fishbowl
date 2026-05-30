import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards against i18n drift: every t('key') used by the fish-input view must
// exist in BOTH runtime locale files, and the two locales must share an
// identical key set. This is the only locale check feasible in the Node-only
// (no jsdom) test harness, and it catches the class of bug where a t() key is
// referenced in markup but missing from public/locales (renders the raw key).

const viewSource = readFileSync(
  fileURLToPath(new URL('./view.js', import.meta.url)),
  'utf8',
);

const ko = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../public/locales/ko.json', import.meta.url)),
    'utf8',
  ),
);
const en = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../public/locales/en.json', import.meta.url)),
    'utf8',
  ),
);

function extractKeys(source) {
  const keys = new Set();
  const re = /t\(\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    keys.add(match[1]);
  }
  return [...keys];
}

const usedKeys = extractKeys(viewSource);

describe('fish-input locale completeness', () => {
  it('extracts at least the draw.* keys it relies on', () => {
    expect(usedKeys).toContain('draw.label');
    expect(usedKeys).toContain('draw.colorLabel');
    expect(usedKeys).toContain('draw.sizeLabel');
  });

  it('every t() key used in view.js exists in the Korean locale', () => {
    const missing = usedKeys.filter((key) => !(key in ko));
    expect(missing, `Missing in ko.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('every t() key used in view.js exists in the English locale', () => {
    const missing = usedKeys.filter((key) => !(key in en));
    expect(missing, `Missing in en.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('Korean and English locales have identical key sets', () => {
    const koKeys = Object.keys(ko).sort();
    const enKeys = Object.keys(en).sort();
    const koOnly = koKeys.filter((key) => !(key in en));
    const enOnly = enKeys.filter((key) => !(key in ko));
    expect(koOnly, `Keys only in ko.json: ${koOnly.join(', ')}`).toEqual([]);
    expect(enOnly, `Keys only in en.json: ${enOnly.join(', ')}`).toEqual([]);
  });
});
