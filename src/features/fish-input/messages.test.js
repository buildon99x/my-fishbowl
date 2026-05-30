import { describe, it, expect } from 'vitest';
import { buildRegisterMessage } from './messages.js';

// Stub t: echoes the key and interpolates {name} the way the real i18n does.
const stubT = (key, vars = {}) => key.replace(/done/, `done[${vars.name ?? ''}]`);

describe('buildRegisterMessage', () => {
  it('uses the fish key for fish props and interpolates the name', () => {
    expect(buildRegisterMessage('fish', 'Goldie', (k, v) => `${k}:${v.name}`))
      .toBe('register.done.fish:Goldie');
  });

  it('uses the deco key for deco props', () => {
    expect(buildRegisterMessage('deco', 'Rock', (k, v) => `${k}:${v.name}`))
      .toBe('register.done.deco:Rock');
  });

  it('defaults unknown types to the fish key', () => {
    expect(buildRegisterMessage(undefined, 'X', (k) => k)).toBe('register.done.fish');
  });

  it('passes the name through for interpolation', () => {
    expect(buildRegisterMessage('fish', 'Nemo', stubT)).toContain('Nemo');
  });
});
