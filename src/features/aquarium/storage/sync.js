/**
 * sync.js — write-through + background reconcile adapter.
 *
 * Public API:
 *   loadAquariumThroughSync()   → Aquarium (loads local immediately, kicks off reconcile)
 *   saveAquariumThroughSync(a)  → void  (saves locally immediately, debounces PUT)
 *   syncState                   → reactive plain object
 *   conflictState               → { serverAquarium, localAquarium, sourceEtag } | null
 *   resolveConflict(choice)     → void  ('overwrite' | 'abandon' | 'merge')
 */

import { loadAquarium as localLoad, saveAquarium as localSave } from './local.js';
import { fetchAquarium, putAquarium } from './remote.js';
import { ApiError } from '../../../services/api.js';

const BACKEND_ENABLED = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_ENABLED === 'true';

// How long to debounce before sending a PUT (ms).
const PUT_DEBOUNCE_MS = 60_000;
// Maximum consecutive 503 failures before disabling auto-sync.
const MAX_FAILURE_STREAK = 5;
// Maximum payload size in bytes before skipping PUT.
const MAX_PAYLOAD_BYTES = 90 * 1024;

/**
 * Reactive sync status object.
 * Consumers can read (and optionally watch) these properties.
 *
 * status values:
 *   'disabled'      — BACKEND_ENABLED=false or too many failures
 *   'idle'          — backend enabled, no pending operations
 *   'syncing'       — a GET or PUT is in-flight
 *   'pending'       — a debounced PUT is queued
 *   'error'         — last operation failed (but auto-sync continues unless disabled)
 *   'conflict'      — 412 received; waiting for resolveConflict()
 *   'owner-changed' — 403 owner_changed received; PUT auto-retry stopped
 */
export const syncState = {
  status: BACKEND_ENABLED ? 'idle' : 'disabled',
  lastSyncedAt: null,
  lastError: null,
  backoffMs: 0,
  failureStreak: 0,
};

/** @type {{ serverAquarium: object, localAquarium: object, sourceEtag: string } | null} */
export let conflictState = null;

/**
 * Injects a conflict state from outside the module (used in tests).
 * @internal
 * @param {{ serverAquarium: object, localAquarium: object, sourceEtag: string } | null} state
 */
export function _setConflictState(state) {
  conflictState = state;
}

// The ETag of the last successfully GET-ted or PUT-ted version.
let currentEtag = null;

// Debounce timer handle.
let debounceTimer = null;

// The aquarium snapshot that was last successfully sent to the server
// (used for dirty-checking).
let lastPushedSnapshot = null;

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

function isSyncGateOpen(aquarium) {
  // Retrieve appState from the global scope if available (set by main.js).
  const appState = typeof window !== 'undefined' ? window.__appState : undefined;

  const onboarding = appState?.onboarding?.getState?.() ?? appState?.onboarding;
  const onboardingCompleted = onboarding?.completed === true;
  const fishCount = Array.isArray(aquarium?.fishes) ? aquarium.fishes.length : 0;

  // Safety valve: if onboarding key is missing/corrupt but fishes exist, pass.
  const onboardingGate = onboardingCompleted || fishCount >= 1;

  if (!onboardingGate) return false;

  // Check magic moment queue is idle.
  const mm = appState?.magicMoment ?? appState?.magicMomentState;
  if (mm) {
    const queueEmpty = Array.isArray(mm.queue) ? mm.queue.length === 0 : true;
    const phaseIdle = !mm.phase || mm.phase === 'idle' || mm.phase === 'done';
    if (!queueEmpty || !phaseIdle) return false;
  }

  return true;
}

function isDefaultEmptyAquarium(aquarium) {
  return (
    Array.isArray(aquarium?.fishes) &&
    aquarium.fishes.length === 0 &&
    aquarium.cleanliness === 100 &&
    aquarium.algaeLevel === 0
  );
}

function payloadTooBig(aquarium) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(aquarium)).length;
    return bytes > MAX_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}

function snapshotsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Background reconcile (called after loading local state)
// --------------------------------------------------------------------------

async function reconcileWithServer(aquarium) {
  if (syncState.status === 'disabled') return;
  if (!isSyncGateOpen(aquarium)) return;

  syncState.status = 'syncing';

  try {
    const remote = await fetchAquarium();

    if (!remote) {
      // Server has no aquarium → migration path: push local if non-empty and non-default.
      if (!isDefaultEmptyAquarium(aquarium)) {
        await doPut(aquarium);
      } else {
        syncState.status = 'idle';
      }
      return;
    }

    currentEtag = remote.etag;

    // Simple last-write-wins: if server updatedAt is newer, log it (but don't
    // auto-apply — that's for the parent zone conflict card via resolveConflict).
    const serverUpdatedAt = remote.aquarium?.updatedAt ?? '';
    const localUpdatedAt = aquarium?.updatedAt ?? '';

    if (serverUpdatedAt > localUpdatedAt) {
      // Server is newer — surface for parent zone.
      // In local-first mode we do not auto-apply; just log.
      console.warn('[sync] Server aquarium is newer; parent zone should prompt user.', { serverUpdatedAt, localUpdatedAt });
    }

    syncState.status = 'idle';
    syncState.lastSyncedAt = new Date().toISOString();
  } catch (err) {
    handleSyncError(err);
  }
}

// --------------------------------------------------------------------------
// PUT with error handling
// --------------------------------------------------------------------------

async function doPut(aquarium) {
  if (syncState.status === 'disabled') return;
  if (isDefaultEmptyAquarium(aquarium)) {
    syncState.status = 'idle';
    return;
  }
  if (payloadTooBig(aquarium)) {
    console.warn('[sync] Payload exceeds 90 KB — PUT skipped. Parent zone sync indicator updated.');
    syncState.status = 'pending';
    return;
  }

  syncState.status = 'syncing';

  try {
    const result = await putAquarium(aquarium, currentEtag);
    currentEtag = result.etag || currentEtag;
    lastPushedSnapshot = aquarium;
    syncState.status = 'idle';
    syncState.lastSyncedAt = new Date().toISOString();
    syncState.failureStreak = 0;
    syncState.backoffMs = 0;
    syncState.lastError = null;
  } catch (err) {
    handleSyncError(err, aquarium);
  }
}

function handleSyncError(err, aquarium) {
  if (!(err instanceof ApiError)) {
    // Network failure or unexpected error.
    syncState.failureStreak += 1;
    syncState.lastError = { code: 'network_error', message: String(err?.message ?? err) };
    if (syncState.failureStreak >= MAX_FAILURE_STREAK) {
      syncState.status = 'disabled';
      console.warn('[sync] Auto-sync disabled after repeated failures.');
    } else {
      syncState.status = 'error';
    }
    return;
  }

  const { status, code } = err;

  if (status === 412 || code === 'etag_mismatch') {
    // Conflict — surface for parent zone.
    conflictState = {
      serverAquarium: err.body?.aquarium ?? null,
      localAquarium: aquarium ?? null,
      sourceEtag: err.body?.etag ?? currentEtag,
    };
    syncState.status = 'conflict';
    syncState.lastError = { code: 'etag_mismatch', message: err.message };
    return;
  }

  if (status === 403 || code === 'owner_changed') {
    syncState.status = 'owner-changed';
    syncState.lastError = { code: 'owner_changed', message: err.message };
    return;
  }

  if (status === 429 || code === 'rate_limited') {
    const retryAfterMs = (parseInt(err.body?.retryAfter ?? '60', 10) || 60) * 1000;
    syncState.status = 'error';
    syncState.lastError = { code: 'rate_limited', message: err.message };
    syncState.backoffMs = retryAfterMs;
    // Re-schedule after Retry-After duration (fire-and-forget, no aquarium capture issue).
    if (aquarium) {
      const captured = aquarium;
      setTimeout(() => {
        if (syncState.status !== 'disabled') doPut(captured);
      }, retryAfterMs);
    }
    return;
  }

  if (status === 503 || code === 'backend_unavailable') {
    syncState.failureStreak += 1;
    syncState.lastError = { code: 'backend_unavailable', message: err.message };
    if (syncState.failureStreak >= MAX_FAILURE_STREAK) {
      syncState.status = 'disabled';
      console.warn('[sync] Auto-sync disabled after 5 consecutive 503 errors.');
    } else {
      syncState.status = 'error';
    }
    return;
  }

  // Other errors (413, 422, 5xx …) — mark error, keep auto-sync enabled.
  syncState.failureStreak += 1;
  syncState.lastError = { code: code ?? String(status), message: err.message };
  syncState.status = 'error';
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Loads the aquarium from local storage immediately, then kicks off a
 * background reconcile with the server when BACKEND_ENABLED=true.
 *
 * @returns {import('../model.js').Aquarium}
 */
export function loadAquariumThroughSync() {
  const aquarium = localLoad();

  if (BACKEND_ENABLED) {
    // Run reconcile in the background; don't await.
    reconcileWithServer(aquarium).catch((err) => {
      console.warn('[sync] Reconcile error (unhandled):', err);
    });
  }

  return aquarium;
}

/**
 * Saves the aquarium to local storage immediately and schedules a debounced
 * PUT to the server when BACKEND_ENABLED=true.
 *
 * @param {import('../model.js').Aquarium} aquarium
 */
export function saveAquariumThroughSync(aquarium) {
  localSave(aquarium);

  if (!BACKEND_ENABLED) return;
  if (syncState.status === 'disabled' || syncState.status === 'owner-changed') return;

  // Dirty-check: skip scheduling if nothing changed since last push.
  if (snapshotsEqual(aquarium, lastPushedSnapshot)) return;

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  syncState.status = 'pending';

  const captured = aquarium;
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    if (!isSyncGateOpen(captured)) {
      syncState.status = 'idle';
      return;
    }
    await doPut(captured);
  }, PUT_DEBOUNCE_MS);
}

/**
 * Resolves a conflict surfaced in the parent zone.
 *
 * @param {'overwrite' | 'abandon' | 'merge'} choice
 */
export async function resolveConflict(choice) {
  if (!conflictState) return;

  const { serverAquarium, localAquarium, sourceEtag } = conflictState;
  conflictState = null;
  syncState.status = 'idle';

  if (choice === 'abandon') {
    // Accept server version — overwrite local.
    if (serverAquarium) {
      localSave(serverAquarium);
      currentEtag = sourceEtag;
    }
    return;
  }

  // 'overwrite' or 'merge' (merge is no-op for now — behaves like overwrite).
  if (localAquarium) {
    // Use the server etag so our PUT is treated as an update to the server's
    // version (satisfying If-Match).
    currentEtag = sourceEtag;
    await doPut(localAquarium);
  }
}
