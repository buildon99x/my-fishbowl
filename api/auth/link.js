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
  // Try Authorization Bearer first
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Try session cookie
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
 * POST /api/auth/link
 *
 * Links the current device to the account associated with the session.
 * Requires a valid session (cookie or Authorization Bearer) and X-Device-Id header.
 *
 * On success, updates:
 *   - device:<deviceId> with accountId
 *   - deviceAccountLink:<deviceId> → accountId
 *   - account:<accountId> linkedDeviceIds (adds deviceId if absent)
 *   - owner:<aquariumId> with accountId (if device has an aquarium)
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
    // Anonymous fallback — return success-like but indicate no session
    return jsonResponse({ error: { code: 'no_session', message: 'No session found — anonymous fallback' } }, 401);
  }

  const claims = await verifySessionToken(token);
  if (!claims) {
    // Expired or invalid session — anonymous fallback per spec
    return jsonResponse({ error: { code: 'session_invalid', message: 'Session is invalid or expired — anonymous fallback' } }, 401);
  }

  const { accountId } = claims;
  const now = new Date().toISOString();

  try {
    const kv = getKv();

    // Update deviceAccountLink
    await kv.set(`deviceAccountLink:${deviceId}`, accountId);

    // Update device record to include accountId
    const existingDevice = await kv.get(`device:${deviceId}`);
    if (existingDevice) {
      await kv.set(`device:${deviceId}`, { ...existingDevice, accountId, lastSeenAt: now });
    }

    // Update account's linkedDeviceIds and aquariumId
    const account = await kv.get(`account:${accountId}`);
    if (account) {
      const linkedDeviceIds = account.linkedDeviceIds || [];
      if (!linkedDeviceIds.includes(deviceId)) {
        linkedDeviceIds.push(deviceId);
      }
      const aquariumId = existingDevice?.aquariumId ?? account.aquariumId;
      await kv.set(`account:${accountId}`, {
        ...account,
        linkedDeviceIds,
        ...(aquariumId ? { aquariumId } : {}),
      });
    }

    // Update owner record to include accountId if device has an aquarium
    if (existingDevice?.aquariumId) {
      const owner = await kv.get(`owner:${existingDevice.aquariumId}`);
      if (owner) {
        await kv.set(`owner:${existingDevice.aquariumId}`, { ...owner, accountId });
      }
    }
  } catch (err) {
    const code = err.code === 'backend_unavailable' ? 'backend_unavailable' : 'internal_error';
    const status = code === 'backend_unavailable' ? 503 : 500;
    return jsonResponse({ error: { code, message: err.message } }, status);
  }

  console.log(JSON.stringify({
    ts: now,
    level: 'info',
    route: '/api/auth/link',
    event: 'auth_link_success',
    accountId,
  }));

  return jsonResponse({ linked: true });
}
