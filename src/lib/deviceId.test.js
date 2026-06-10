import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearDeviceId,
  DEVICE_ID_KEY,
  getOrCreateDeviceId,
  rotateDeviceId,
} from './deviceId.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
};

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('deviceId', () => {
  beforeEach(() => memory.clear());

  it('creates a UUID v4 device ID when none exists', () => {
    const id = getOrCreateDeviceId();
    expect(id).toMatch(UUID_V4_PATTERN);
    expect(memory.get(DEVICE_ID_KEY)).toBe(id);
  });

  it('returns the same ID on subsequent calls', () => {
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(second).toBe(first);
  });

  it('replaces an invalid stored value with a fresh UUID', () => {
    memory.set(DEVICE_ID_KEY, 'not-a-uuid');
    const id = getOrCreateDeviceId();
    expect(id).toMatch(UUID_V4_PATTERN);
    expect(id).not.toBe('not-a-uuid');
  });

  it('rotates to a supplied valid ID', () => {
    const newId = '550e8400-e29b-41d4-a716-446655440000';
    expect(rotateDeviceId(newId)).toBe(newId);
    expect(memory.get(DEVICE_ID_KEY)).toBe(newId);
  });

  it('rotates to a fresh UUID when supplied ID is invalid', () => {
    getOrCreateDeviceId();
    const rotated = rotateDeviceId('bad');
    expect(rotated).toMatch(UUID_V4_PATTERN);
    expect(rotated).not.toBe('bad');
  });

  it('clears the stored device ID', () => {
    getOrCreateDeviceId();
    clearDeviceId();
    expect(memory.has(DEVICE_ID_KEY)).toBe(false);
  });
});
