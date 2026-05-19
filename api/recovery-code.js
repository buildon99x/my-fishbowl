/**
 * POST /api/recovery-code
 *
 * Issues a new recovery code for the aquarium owned by the requesting device.
 *
 * Security notes:
 *  - The plain-text code is NEVER logged or stored — only its SHA-256 hash is
 *    persisted in KV.
 *  - All responses carry `Cache-Control: no-store` to prevent proxy caching.
 *  - Rate limit: 1 issue per hour per device.
 */

import { getRequestContext } from './_lib/context.js';
import { getDevice, getKv } from './_lib/kv.js';
import {
  buildActiveKey,
  buildRecoveryKey,
  generateRecoveryCode,
  hashCode,
} from './_lib/recoveryCode.js';

/**
 * Build a JSON Response with standard headers.
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
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id');
  }
  return res;
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

  // Extract and validate device context
  const ctx = getRequestContext(req);
  if (ctx.error) {
    return withCors(
      jsonResponse(
        { error: { code: ctx.error.code, message: ctx.error.message } },
        ctx.error.status,
      ),
    );
  }

  const { deviceId } = ctx;

  try {
    const kv = getKv();

    // 1. Look up device → aquariumId
    const device = await getDevice(deviceId);
    if (!device) {
      return withCors(
        jsonResponse(
          { error: { code: 'aquarium_not_found', message: 'No aquarium found for this device' } },
          404,
        ),
      );
    }

    const { aquariumId } = device;

    // 2. Rate limit: 1 issue per hour per device (SETNX with TTL 3600s)
    const rateLimitKey = `recovery-ratelimit:${deviceId}`;
    const rateLimitSet = await kv.set(rateLimitKey, '1', { nx: true, ex: 3600 });
    if (rateLimitSet === null) {
      // Key already existed — rate limit exceeded
      return withCors(
        jsonResponse(
          {
            error: {
              code: 'rate_limited',
              message: 'Recovery code may only be issued once per hour per device',
            },
          },
          429,
        ),
      );
    }

    // 3. If an active code already exists for this aquarium, invalidate it
    const activeKey = buildActiveKey(aquariumId);
    const existingHash = await kv.get(activeKey);
    if (existingHash) {
      await kv.del(buildRecoveryKey(existingHash));
    }

    // 4. Generate a new code and hash it
    //    NOTE: the plain code is NEVER logged. It is returned once to the caller
    //    and immediately discarded server-side.
    const code = generateRecoveryCode();
    const hash = hashCode(code);

    // 5. Persist metadata (hash only — not the plain code)
    const now = new Date();
    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const recoveryKey = buildRecoveryKey(hash);
    await Promise.all([
      kv.set(recoveryKey, { aquariumId, expiresAt, issuedAt }),
      kv.set(activeKey, hash),
    ]);

    // 6. Return plain code ONCE — never again
    return withCors(jsonResponse({ code }, 200));
  } catch (err) {
    const isBackendError = err.code === 'backend_unavailable';
    const status = isBackendError ? 503 : 500;
    const code = isBackendError ? 'backend_unavailable' : 'internal_error';
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        route: '/api/recovery-code',
        error: err.message,
      }),
    );
    return withCors(jsonResponse({ error: { code, message: err.message } }, status));
  }
}
