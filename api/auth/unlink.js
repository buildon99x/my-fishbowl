import { getRequestContext } from '../_lib/context.js';
import { verifySessionToken, SESSION_COOKIE_NAME } from '../_lib/session.js';
import { getKv } from '../_lib/kv.js';

/**
 * Parses cookies from the Cookie header into a plain object.
 *
 * @param {string} cookieHeader
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Extracts a session token from either the session cookie or Authorization Bearer header.
 *
 * @param {Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Build a JSON Response.
 *
 * @param {object} body
 * @param {number} status
 * @returns {Response}
 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /api/auth/unlink
 *
 * Unlinks the current device from its associated account.
 * Requires a valid session and X-Device-Id header.
 *
 * On success:
 *   - Deletes deviceAccountLink:<deviceId>
 *   - Removes accountId from account.linkedDeviceIds
 *   - Removes accountId from owner:<aquariumId>
 *   - Aquarium data is preserved; device reverts to anonymous ownership
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: { code: 'method_not_allowed', message: 'Only POST is supported' } }, 405);
  }

  // Validate device ID
  const ctx = getRequestContext(req);
  if (ctx.error) {
    return jsonResponse({ error: { code: ctx.error.code, message: ctx.error.message } }, ctx.error.status);
  }
  const { deviceId } = ctx;

  // Validate session
  const token = extractToken(req);
  if (!token) {
    return jsonResponse({ error: { code: 'no_session', message: 'No session found — anonymous fallback' } }, 401);
  }

  const claims = await verifySessionToken(token);
  if (!claims) {
    return jsonResponse({ error: { code: 'session_invalid', message: 'Session is invalid or expired — anonymous fallback' } }, 401);
  }

  const { accountId } = claims;
  const now = new Date().toISOString();

  try {
    const kv = getKv();

    // Delete the device → account link
    await kv.del(`deviceAccountLink:${deviceId}`);

    // Remove deviceId from account's linkedDeviceIds
    const account = await kv.get(`account:${accountId}`);
    if (account) {
      const linkedDeviceIds = (account.linkedDeviceIds || []).filter((id) => id !== deviceId);
      await kv.set(`account:${accountId}`, { ...account, linkedDeviceIds });
    }

    // Remove accountId from the owner record — aquarium stays, just reverts to device-only ownership
    const device = await kv.get(`device:${deviceId}`);
    if (device?.aquariumId) {
      const owner = await kv.get(`owner:${device.aquariumId}`);
      if (owner) {
        // eslint-disable-next-line no-unused-vars
        const { accountId: _removed, ...ownerWithoutAccount } = owner;
        await kv.set(`owner:${device.aquariumId}`, ownerWithoutAccount);
      }
    }

    // Remove accountId from device record
    if (device) {
      // eslint-disable-next-line no-unused-vars
      const { accountId: _removed, ...deviceWithoutAccount } = device;
      await kv.set(`device:${deviceId}`, { ...deviceWithoutAccount, lastSeenAt: now });
    }
  } catch (err) {
    const code = err.code === 'backend_unavailable' ? 'backend_unavailable' : 'internal_error';
    const status = code === 'backend_unavailable' ? 503 : 500;
    return jsonResponse({ error: { code, message: err.message } }, status);
  }

  console.log(JSON.stringify({
    ts: now,
    level: 'info',
    route: '/api/auth/unlink',
    event: 'auth_unlink',
    accountId,
  }));

  return jsonResponse({ unlinked: true });
}
