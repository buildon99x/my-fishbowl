import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API layer so BACKEND_ENABLED is true and no real network occurs.
// Defined via vi.hoisted so it exists before the hoisted vi.mock factory runs.
const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class MockApiError extends Error {
    constructor(status, code, message, body) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.body = body;
    }
  },
}));

vi.mock('../../../services/api.js', () => ({
  BACKEND_ENABLED: true,
  ApiError: MockApiError,
  apiFetch: vi.fn(),
}));

// Mock remote so each branch can be driven deterministically.
vi.mock('./remote.js', () => ({
  fetchAquarium: vi.fn(),
  putAquarium: vi.fn(),
}));

import { fetchAquarium, putAquarium } from './remote.js';
import { reconcileAquarium, syncState, __resetSync, flushRemoteWrite, saveAquarium } from './sync.js';
import { STORAGE_KEY } from './local.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
};

function makeAquarium(updatedAt, extra = {}) {
  return {
    id: 'aq-1',
    name: 'test',
    fishes: [],
    cleanliness: 100,
    algaeLevel: 0,
    bounds: { shape: 'rounded-bowl', width: 1152, height: 780, padding: 66 },
    lastCleanedAt: updatedAt,
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

function seedLocal(aquarium) {
  memory.set(STORAGE_KEY, JSON.stringify(aquarium));
}

describe('reconcileAquarium', () => {
  beforeEach(() => {
    memory.clear();
    vi.clearAllMocks();
    __resetSync();
  });

  it('local-only: migrates local copy when server is empty', async () => {
    const local = makeAquarium('2026-05-24T10:00:00.000Z');
    seedLocal(local);
    fetchAquarium.mockResolvedValue({ aquarium: null, etag: null });
    putAquarium.mockResolvedValue({ aquarium: local, etag: 'etag-1' });

    const result = await reconcileAquarium();

    expect(fetchAquarium).toHaveBeenCalledOnce();
    expect(putAquarium).toHaveBeenCalledOnce();
    expect(result.id).toBe('aq-1');
    expect(syncState.status).toBe('synced');
    expect(syncState.etag).toBe('etag-1');
  });

  it('server-newer: adopts the server copy', async () => {
    seedLocal(makeAquarium('2026-05-24T09:00:00.000Z'));
    const remote = makeAquarium('2026-05-24T12:00:00.000Z', { name: 'remote' });
    fetchAquarium.mockResolvedValue({ aquarium: remote, etag: 'etag-remote' });

    const result = await reconcileAquarium();

    expect(result.name).toBe('remote');
    expect(putAquarium).not.toHaveBeenCalled();
    expect(syncState.status).toBe('synced');
    expect(syncState.etag).toBe('etag-remote');
    // local should have been overwritten with the server copy
    expect(JSON.parse(memory.get(STORAGE_KEY)).name).toBe('remote');
  });

  it('conflict-412: enters conflict state on concurrent PUT', async () => {
    seedLocal(makeAquarium('2026-05-24T15:00:00.000Z', { name: 'local-new' }));
    const remote = makeAquarium('2026-05-24T09:00:00.000Z', { name: 'remote-old' });
    fetchAquarium.mockResolvedValue({ aquarium: remote, etag: 'etag-remote' });
    putAquarium.mockRejectedValue(new MockApiError(412, 'conflict', 'Precondition Failed'));

    const result = await reconcileAquarium();

    expect(putAquarium).toHaveBeenCalledOnce();
    expect(result.name).toBe('local-new');
    expect(syncState.status).toBe('conflict');
    expect(syncState.failureStreak).toBe(1);
  });

  it('network-failure: falls back to local copy', async () => {
    const local = makeAquarium('2026-05-24T10:00:00.000Z', { name: 'local-fallback' });
    seedLocal(local);
    fetchAquarium.mockRejectedValue(new MockApiError(0, 'network_error', 'offline'));

    const result = await reconcileAquarium();

    expect(result.name).toBe('local-fallback');
    expect(putAquarium).not.toHaveBeenCalled();
    expect(syncState.status).toBe('offline');
  });
});

describe('flushRemoteWrite', () => {
  beforeEach(() => {
    memory.clear();
    vi.clearAllMocks();
    __resetSync();
  });

  it('flush failure restores pendingAquarium for retry', async () => {
    const aquarium = makeAquarium('2026-05-24T10:00:00.000Z', { name: 'pending' });
    seedLocal(aquarium);

    // Queue a pending write via saveAquarium (sets pendingAquarium internally)
    saveAquarium(aquarium);
    putAquarium.mockRejectedValue(new MockApiError(0, 'network_error', 'offline'));

    await flushRemoteWrite();

    // After failure, status should be offline and backoff should be set
    expect(syncState.status).toBe('offline');
    expect(syncState.failureStreak).toBe(1);
    expect(syncState.backoffMs).toBeGreaterThan(0);
  });

  it('flush success marks status as synced', async () => {
    const aquarium = makeAquarium('2026-05-24T11:00:00.000Z', { name: 'success' });
    seedLocal(aquarium);

    saveAquarium(aquarium);
    putAquarium.mockResolvedValue({ aquarium, etag: 'etag-flush-1' });

    await flushRemoteWrite();

    expect(syncState.status).toBe('synced');
    expect(syncState.etag).toBe('etag-flush-1');
    expect(syncState.failureStreak).toBe(0);
  });
});
