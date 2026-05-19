import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDeviceId, getOrCreateDeviceId, rotateDeviceId } from './deviceId.js';

const DEVICE_ID_KEY = 'my-fishbowl:deviceId';

// UUID v4 regex
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let storage;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  });
  // Allow real UUID generation for these tests; also support stubbing.
  // Capture the native randomUUID before stubbing to avoid infinite recursion.
  const nativeRandomUUID = crypto.randomUUID.bind(crypto);
  vi.stubGlobal('crypto', { randomUUID: () => nativeRandomUUID() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getOrCreateDeviceId', () => {
  it('generates a UUID v4 on first call', () => {
    const id = getOrCreateDeviceId();
    expect(UUID_V4_RE.test(id)).toBe(true);
    expect(storage.get(DEVICE_ID_KEY)).toBe(id);
  });

  it('returns the same ID on subsequent calls', () => {
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(second).toBe(first);
  });

  it('uses a pre-existing stored ID without creating a new one', () => {
    storage.set(DEVICE_ID_KEY, 'preset-id');
    const id = getOrCreateDeviceId();
    expect(id).toBe('preset-id');
  });
});

describe('rotateDeviceId', () => {
  it('overwrites the stored ID with the given value', () => {
    getOrCreateDeviceId(); // seed
    rotateDeviceId('new-device-id');
    expect(storage.get(DEVICE_ID_KEY)).toBe('new-device-id');
  });

  it('allows subsequent getOrCreateDeviceId to return the rotated ID', () => {
    rotateDeviceId('rotated-id');
    expect(getOrCreateDeviceId()).toBe('rotated-id');
  });
});

describe('clearDeviceId', () => {
  it('removes the device ID from storage', () => {
    getOrCreateDeviceId(); // seed
    clearDeviceId();
    expect(storage.has(DEVICE_ID_KEY)).toBe(false);
  });

  it('causes getOrCreateDeviceId to generate a fresh ID after clearing', () => {
    const original = getOrCreateDeviceId();
    clearDeviceId();
    // Stub a deterministic UUID so we can confirm it differs from original
    vi.stubGlobal('crypto', { randomUUID: () => 'brand-new-id' });
    const fresh = getOrCreateDeviceId();
    expect(fresh).toBe('brand-new-id');
    expect(fresh).not.toBe(original);
  });
});
