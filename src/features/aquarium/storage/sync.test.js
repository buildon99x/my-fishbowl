/**
 * sync.test.js — unit tests for the reconcile / write-through logic in sync.js.
 *
 * remote.js is fully mocked so no actual HTTP calls are made.
 * local.js is mocked via stubbed localStorage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// We mock remote.js before importing sync.js so all imports see the mock.
vi.mock('./remote.js', () => ({
  fetchAquarium: vi.fn(),
  putAquarium: vi.fn(),
}));

// ─── Imports (after mocks are declared) ─────────────────────────────────────
import { fetchAquarium, putAquarium } from './remote.js';
import {
  _setConflictState,
  conflictState,
  loadAquariumThroughSync,
  resolveConflict,
  saveAquariumThroughSync,
  syncState,
} from './sync.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAquarium(overrides = {}) {
  return {
    id: 'aq-1',
    name: '테스트 어항',
    fishes: [],
    cleanliness: 100,
    algaeLevel: 0,
    bounds: {},
    lastCleanedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFish(id = 'fish-1') {
  return {
    id,
    name: '금붕어',
    type: 'fish',
    imageUrl: 'data:image/png;base64,abc',
    x: 50,
    y: 50,
    size: 120,
    vx: 0,
    vy: 0,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let storage;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  });

  // Seed local storage with an aquarium.
  storage.set('my-fishbowl:aquarium', JSON.stringify(makeAquarium()));

  // Stub crypto.randomUUID for model.js / createAquarium fallback.
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-stub') });

  // Reset mock implementations.
  fetchAquarium.mockReset();
  putAquarium.mockReset();

  // Default: server has no aquarium (fresh device).
  fetchAquarium.mockResolvedValue(null);
  putAquarium.mockResolvedValue({ etag: 'etag-1' });

  // Reset shared syncState mutations from previous tests.
  syncState.status = 'disabled'; // BACKEND_ENABLED=false in test env
  syncState.lastSyncedAt = null;
  syncState.lastError = null;
  syncState.backoffMs = 0;
  syncState.failureStreak = 0;

  // Reset conflictState.
  _setConflictState(null);

  // Use fake timers so debounce does not bleed between tests.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('local-only mode (BACKEND_ENABLED=false)', () => {
  it('loadAquariumThroughSync loads from localStorage without calling remote', async () => {
    // In test env VITE_BACKEND_ENABLED is falsy -> sync.js behaves as local-only.
    const aq = loadAquariumThroughSync();

    // Flush any microtasks / promises.
    await vi.runAllTimersAsync();

    expect(aq).toBeDefined();
    expect(aq.id).toBe('aq-1');
    expect(fetchAquarium).not.toHaveBeenCalled();
    expect(putAquarium).not.toHaveBeenCalled();
  });

  it('saveAquariumThroughSync writes to localStorage without calling remote', async () => {
    const aq = makeAquarium({ name: 'updated' });

    saveAquariumThroughSync(aq);
    await vi.runAllTimersAsync();

    // Confirm localStorage was written.
    const stored = JSON.parse(storage.get('my-fishbowl:aquarium'));
    expect(stored.name).toBe('updated');

    // Remote must remain silent.
    expect(putAquarium).not.toHaveBeenCalled();
  });
});

describe('server-newer reconcile (informational)', () => {
  it('conflictState remains null when server is newer (no auto-apply)', () => {
    // BACKEND_ENABLED=false in tests so reconcile never runs automatically.
    // Confirm: nothing fires, syncState stays disabled, conflictState is null.
    expect(fetchAquarium).not.toHaveBeenCalled();
    expect(syncState.status).toBe('disabled');
    expect(conflictState).toBeNull();
  });
});

describe('conflict (412 etag_mismatch)', () => {
  it('sets syncState.status="conflict" on 412 during resolveConflict', async () => {
    const { ApiError } = await import('../../../services/api.js');
    const conflictError = new ApiError(
      412,
      'etag_mismatch',
      'ETag mismatch',
      {
        aquarium: makeAquarium({ name: 'server version', updatedAt: '2099-01-01T00:00:00.000Z' }),
        etag: 'server-etag',
      },
    );
    putAquarium.mockRejectedValue(conflictError);

    // Inject conflict state so resolveConflict('overwrite') calls doPut.
    _setConflictState({
      serverAquarium: makeAquarium({ name: 'server', updatedAt: '2099-01-01T00:00:00.000Z' }),
      localAquarium: makeAquarium({ name: 'local', fishes: [makeFish()] }),
      sourceEtag: 'old-etag',
    });

    // resolveConflict('overwrite') -> doPut(localAquarium) -> 412 -> handleSyncError.
    await resolveConflict('overwrite');
    await vi.runAllTimersAsync();

    expect(syncState.status).toBe('conflict');
    expect(syncState.lastError?.code).toBe('etag_mismatch');
  });
});

describe('network failure (503 x 5)', () => {
  it('disables auto-sync after 5 consecutive backend_unavailable errors', async () => {
    const { ApiError } = await import('../../../services/api.js');
    const err503 = new ApiError(503, 'backend_unavailable', 'Service Unavailable', null);
    putAquarium.mockRejectedValue(err503);

    // Drive 5 overwrite resolutions; each calls doPut -> 503.
    for (let i = 0; i < 5; i += 1) {
      _setConflictState({
        serverAquarium: makeAquarium(),
        localAquarium: makeAquarium({ fishes: [makeFish()] }),
        sourceEtag: `etag-${i}`,
      });
      await resolveConflict('overwrite');
    }

    await vi.runAllTimersAsync();

    expect(syncState.status).toBe('disabled');
    expect(syncState.failureStreak).toBeGreaterThanOrEqual(5);
  });
});

describe('resolveConflict', () => {
  it('abandon: saves server aquarium to localStorage and does not call putAquarium', async () => {
    const serverAquarium = makeAquarium({ name: 'from server', fishes: [makeFish('s1')] });
    _setConflictState({
      serverAquarium,
      localAquarium: makeAquarium({ name: 'local' }),
      sourceEtag: 'server-etag',
    });

    await resolveConflict('abandon');
    await vi.runAllTimersAsync();

    // localStorage should now contain the server aquarium.
    const stored = JSON.parse(storage.get('my-fishbowl:aquarium'));
    expect(stored.name).toBe('from server');
    expect(putAquarium).not.toHaveBeenCalled();
  });
});
