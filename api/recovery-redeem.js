/**
 * POST /api/recovery-redeem
 *
 * Redeems a recovery code to transfer aquarium ownership to a new device.
 *
 * Security notes:
 *  - The plain-text code is NEVER logged — only its SHA-256 hash is used.
 *  - All responses carry `Cache-Control: no-store`.
 *  - Rate limit: 5 attempts per minute per IP. After 5 failures, 30-minute cooldown.
 *  - Distributed lock (SETNX, EX=10s) prevents concurrent redemption of the same code.
 */

import { createHash } from 'node:crypto';
import { getKv, getOwner, setOwner, setDevice } from './_lib/kv.js';
import {
  buildRecoveryKey,
  buildActiveKey,
  buildLockKey,
  hashCode,
} from './_lib/recoveryCode.js';

/** UUID v4 pattern */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Max redeem attempts per minute per IP before rate-limiting */
const RATE_LIMIT_MAX = 5;
/** TTL for the per-IP attempt counter (seconds) */
const RATE_LIMIT_WINDOW = 60;
/** Number of failures within a window that triggers cooldown */
const COOLDOWN_THRESHOLD = 5;
/** Cooldown duration in seconds (30 minutes) */
const COOLDOWN_TTL = 1800;

/**
 * Build a JSON Response with standard no-cache headers.
 *
 * @param {object} body
 * @param {number} status
 * @param {Record<string,string>} [extraHeaders]
 * @returns {Response}
 */
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

/**
 * Adds CORS headers when not running in production.
 *
 * @param {Response} res
 * @returns {Response}
 */
function withCors(res) {
  if (process.env.VERCEL_ENV !== 'production') {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return res;
}

/**
 * Extract a best-effort client IP from request headers.
 * Falls back to 'unknown' if no IP can be determined.
 *
 * @param {Request} req
 * @returns {string}
 */
function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Hash the IP address so the raw IP is not used as a KV key (minor privacy measure).
 *
 * @param {string} ip
 * @returns {string}
 */
function hashIp(ip) {
  return createHash('sha256').update(ip, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Records a failed redemption attempt against the per-IP counter.
 * Sets a 30-minute cooldown key once COOLDOWN_THRESHOLD failures accumulate.
 *
 * This is intentionally separate from the rate-limit counter that tracks
 * all attempts: after successful redemption the failure count is irrelevant,
 * but we still want brute-force protection on failed attempts.
 *
 * @param {import('@vercel/kv').VercelKV} kv
 * @param {string} failuresKey   Per-IP failure counter key
 * @param {string} cooldownKey   Per-IP cooldown key
 * @returns {Promise<void>}
 */
async function recordFailure(kv, failuresKey, cooldownKey) {
  try {
    const count = await kv.incr(failuresKey);
    if (count === 1) {
      // Anchor the failure window on first failure
      await kv.expire(failuresKey, RATE_LIMIT_WINDOW);
    }
    if (count >= COOLDOWN_THRESHOLD) {
      // Trigger a 30-minute cooldown; NX so it does not reset an existing one
      await kv.set(cooldownKey, '1', { nx: true, ex: COOLDOWN_TTL });
    }
  } catch {
    // Non-fatal — best effort
  }
}

/**
 * Vercel Function handler — Web API style.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  const method = req.method?.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }));
  }

  if (method !== 'POST') {
    return withCors(
      jsonResponse(
        { error: { code: 'method_not_allowed', message: 'Only POST is supported' } },
        405,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Parse and validate request body
  // ---------------------------------------------------------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return withCors(
      jsonResponse(
        { error: { code: 'invalid_json', message: 'Request body must be valid JSON' } },
        400,
      ),
    );
  }

  const { code, newDeviceId } = body ?? {};

  if (!code || typeof code !== 'string') {
    return withCors(
      jsonResponse(
        { error: { code: 'missing_field', message: 'Field "code" is required' } },
        400,
      ),
    );
  }

  if (!newDeviceId || typeof newDeviceId !== 'string') {
    return withCors(
      jsonResponse(
        { error: { code: 'missing_field', message: 'Field "newDeviceId" is required' } },
        400,
      ),
    );
  }

  if (!UUID_V4_REGEX.test(newDeviceId)) {
    return withCors(
      jsonResponse(
        { error: { code: 'invalid_device_id', message: 'newDeviceId must be a valid UUID v4' } },
        400,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Obtain KV client
  // ---------------------------------------------------------------------------
  let kv;
  try {
    kv = getKv();
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        route: '/api/recovery-redeem',
        error: err.message,
      }),
    );
    return withCors(
      jsonResponse(
        { error: { code: 'backend_unavailable', message: err.message } },
        503,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Rate limiting: 5 attempts / minute / IP
  // ---------------------------------------------------------------------------
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const attemptsKey = `recovery-attempts:${ipHash}`;
  const failuresKey = `recovery-failures:${ipHash}`;
  const cooldownKey = `recovery-cooldown:${ipHash}`;

  let lockAcquired = false;
  let lockKey = null;

  try {
    // Check active cooldown first (set after 5 accumulated failures)
    const inCooldown = await kv.get(cooldownKey);
    if (inCooldown) {
      return withCors(
        jsonResponse(
          {
            error: {
              code: 'rate_limited',
              message: 'Too many failed attempts. Please wait 30 minutes before trying again.',
            },
          },
          429,
        ),
      );
    }

    // Enforce per-minute attempt cap (5 per minute, regardless of success/failure)
    const attempts = await kv.incr(attemptsKey);
    if (attempts === 1) {
      // Anchor the rate-limit window on the first request
      await kv.expire(attemptsKey, RATE_LIMIT_WINDOW);
    }

    if (attempts > RATE_LIMIT_MAX) {
      return withCors(
        jsonResponse(
          {
            error: {
              code: 'rate_limited',
              message: 'Too many attempts. Please wait before trying again.',
            },
          },
          429,
        ),
      );
    }

    // ---------------------------------------------------------------------------
    // Acquire distributed lock to prevent concurrent redemption of the same code
    // ---------------------------------------------------------------------------
    const hash = hashCode(code);
    lockKey = buildLockKey(hash);

    const lockResult = await kv.set(lockKey, '1', { nx: true, ex: 10 });
    if (lockResult === null) {
      // Lock already held — another request is redeeming this code concurrently
      return withCors(
        jsonResponse(
          {
            error: {
              code: 'in_progress',
              message: 'This code is already being redeemed. Please try again shortly.',
            },
          },
          409,
        ),
      );
    }
    lockAcquired = true;

    // ---------------------------------------------------------------------------
    // Look up recovery record
    // ---------------------------------------------------------------------------
    const recoveryKey = buildRecoveryKey(hash);
    const record = await kv.get(recoveryKey);

    if (!record) {
      await kv.del(lockKey);
      lockAcquired = false;
      await recordFailure(kv, failuresKey, cooldownKey);
      return withCors(
        jsonResponse(
          { error: { code: 'not_found', message: 'Recovery code not found or already used.' } },
          400,
        ),
      );
    }

    // ---------------------------------------------------------------------------
    // Check expiry
    // ---------------------------------------------------------------------------
    if (new Date(record.expiresAt) < new Date()) {
      await kv.del(lockKey);
      lockAcquired = false;
      await recordFailure(kv, failuresKey, cooldownKey);
      return withCors(
        jsonResponse(
          { error: { code: 'expired', message: 'Recovery code has expired. Please issue a new one.' } },
          400,
        ),
      );
    }

    // ---------------------------------------------------------------------------
    // Transfer ownership (standard 4-key consistency order per spec)
    // ---------------------------------------------------------------------------
    const { aquariumId } = record;
    const now = new Date().toISOString();

    // Get current owner to retrieve oldDeviceId and preserve optional accountId
    const ownerRecord = await getOwner(aquariumId);
    const oldDeviceId = ownerRecord?.deviceId ?? null;

    // a. Update owner record — preserve accountId if present (for S-025d OAuth)
    const newOwner = { deviceId: newDeviceId };
    if (ownerRecord?.accountId) {
      newOwner.accountId = ownerRecord.accountId;
    }
    await setOwner(aquariumId, newOwner);

    // b. Upsert new device record
    await setDevice(newDeviceId, { aquariumId, createdAt: now, lastSeenAt: now });

    // c. Remove old device's records (if different from the new device)
    if (oldDeviceId && oldDeviceId !== newDeviceId) {
      await kv.del(`device:${oldDeviceId}`);
      // Also clean up stale OAuth device-account link (if any)
      await kv.del(`deviceAccountLink:${oldDeviceId}`);
    }

    // d & e. Delete the recovery entries so the code cannot be reused
    await kv.del(recoveryKey);
    await kv.del(buildActiveKey(aquariumId));

    // f. Release the lock
    await kv.del(lockKey);
    lockAcquired = false;

    return withCors(jsonResponse({ success: true }, 200));
  } catch (err) {
    // Always release lock on unexpected errors
    if (lockAcquired && lockKey) {
      try {
        await kv.del(lockKey);
      } catch {
        // best-effort — lock will expire naturally after EX=10s
      }
    }

    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        route: '/api/recovery-redeem',
        error: err.message,
      }),
    );

    const isBackendError = err.code === 'backend_unavailable';
    const status = isBackendError ? 503 : 500;
    const errCode = isBackendError ? 'backend_unavailable' : 'internal_error';
    return withCors(jsonResponse({ error: { code: errCode, message: err.message } }, status));
  }
}
