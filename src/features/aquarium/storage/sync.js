import { BACKEND_ENABLED, ApiError } from '../../../services/api.js';
import { normalizeAquarium } from '../model.js';
import {
  hasLocalAquarium,
  loadLocalAquarium,
  saveLocalAquarium,
} from './local.js';
import { fetchAquarium, putAquarium } from './remote.js';

const REMOTE_DEBOUNCE_MS = 60_000;

// Shared sync state. Mirrored onto appState.sync by the host application.
export const syncState = {
  status: 'idle', // idle | syncing | synced | offline | conflict | error
  lastSyncedAt: null,
  lastError: null,
  backoffMs: 0,
  failureStreak: 0,
  etag: null,
};

let remoteTimer = null;
let pendingAquarium = null;
let isFlushing = false;

function resetSyncState() {
  syncState.status = 'idle';
  syncState.lastSyncedAt = null;
  syncState.lastError = null;
  syncState.backoffMs = 0;
  syncState.failureStreak = 0;
  syncState.etag = null;
}

function markSynced(etag) {
  syncState.status = 'synced';
  syncState.lastSyncedAt = new Date().toISOString();
  syncState.lastError = null;
  syncState.backoffMs = 0;
  syncState.failureStreak = 0;
  if (etag !== undefined) syncState.etag = etag;
}

function markFailure(status, error) {
  syncState.status = status;
  syncState.lastError = error?.message ?? String(error);
  syncState.failureStreak += 1;
  syncState.backoffMs = Math.min(60_000, 1000 * 2 ** (syncState.failureStreak - 1));
}

function getUpdatedAt(aquarium) {
  const value = aquarium?.updatedAt;
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
}

// Public surface preserved from the original storage.js.
export function loadAquarium() {
  return loadLocalAquarium();
}

export function saveAquarium(aquarium) {
  saveLocalAquarium(aquarium);

  if (!BACKEND_ENABLED) {
    return;
  }

  scheduleRemoteWrite(aquarium);
}

function scheduleRemoteWrite(aquarium) {
  pendingAquarium = aquarium;  // Always capture latest

  if (remoteTimer || isFlushing) {
    return;  // Already scheduled or in-flight; pendingAquarium is updated above
  }

  remoteTimer = setTimeout(() => {
    remoteTimer = null;
    void flushRemoteWrite();
  }, REMOTE_DEBOUNCE_MS);
}

export async function flushRemoteWrite() {
  if (!BACKEND_ENABLED || pendingAquarium == null) {
    return;
  }
  if (isFlushing) {
    return;  // Already in flight; scheduleRemoteWrite will re-queue when done
  }

  const aquarium = pendingAquarium;
  pendingAquarium = null;
  isFlushing = true;         // Set BEFORE await
  syncState.status = 'syncing';

  try {
    const { etag } = await putAquarium(aquarium, syncState.etag);
    markSynced(etag);
  } catch (error) {
    // Restore pending only if no newer save arrived during flight
    if (pendingAquarium == null) pendingAquarium = aquarium;

    if (error instanceof ApiError && error.status === 412) {
      markFailure('conflict', error);
    } else if (error instanceof ApiError && error.status === 0) {
      markFailure('offline', error);
    } else {
      markFailure('error', error);
    }

    // Schedule a retry using exponential backoff (computed by markFailure).
    if (syncState.backoffMs > 0 && syncState.failureStreak <= 5) {
      remoteTimer = setTimeout(() => {
        remoteTimer = null;
        void flushRemoteWrite();
      }, syncState.backoffMs);
    }
  } finally {
    isFlushing = false;      // Always clear
    // If a new save arrived during flight and no timer is pending, schedule flush
    if (pendingAquarium != null && !remoteTimer) {
      remoteTimer = setTimeout(() => {
        remoteTimer = null;
        void flushRemoteWrite();
      }, REMOTE_DEBOUNCE_MS);
    }
  }
}

// Boot-time reconciliation. Returns the aquarium the app should render.
// Branches: local-only, server-newer, conflict (412), network-failure.
export async function reconcileAquarium() {
  if (!BACKEND_ENABLED) {
    resetSyncState();
    return loadLocalAquarium();
  }

  syncState.status = 'syncing';
  const local = loadLocalAquarium();
  const localExists = hasLocalAquarium();

  let remote;
  try {
    remote = await fetchAquarium();
  } catch (error) {
    // network-failure: fall back to local copy.
    markFailure('offline', error);
    return local;
  }

  // local-only: server has nothing, migrate local up.
  if (!remote.aquarium) {
    try {
      const { etag } = await putAquarium(local, null);
      markSynced(etag);
    } catch (error) {
      if (error instanceof ApiError && error.status === 412) {
        markFailure('conflict', error);
      } else {
        markFailure('offline', error);
      }
    }
    return local;
  }

  const remoteAquarium = normalizeAquarium(remote.aquarium);

  // server-newer: adopt the server copy.
  if (!localExists || getUpdatedAt(remoteAquarium) > getUpdatedAt(local)) {
    saveLocalAquarium(remoteAquarium);
    markSynced(remote.etag);
    return remoteAquarium;
  }

  // Local is newer: push it, watching for a 412 conflict.
  try {
    const { etag } = await putAquarium(local, remote.etag);
    markSynced(etag);
    return local;
  } catch (error) {
    if (error instanceof ApiError && error.status === 412) {
      // conflict-412: concurrent writes from another device.
      markFailure('conflict', error);
      syncState.etag = remote.etag;
      return local;
    }
    markFailure('offline', error);
    return local;
  }
}

// Test/host helper.
export function __resetSync() {
  if (remoteTimer) {
    clearTimeout(remoteTimer);
    remoteTimer = null;
  }
  pendingAquarium = null;
  isFlushing = false;
  resetSyncState();
}
