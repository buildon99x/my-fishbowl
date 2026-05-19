import { verifySessionToken, SESSION_COOKIE_NAME } from './_lib/session.js';
import { getKv } from './_lib/kv.js';

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
 * DELETE /api/account
 *
 * Deletes the account and all associated data synchronously:
 *   - account:<accountId>
 *   - deviceAccountLink:<deviceId> for all linked devices
 *   - aquarium:<aquariumId> + owner:<aquariumId> for mapped aquarium
 *   - device:<deviceId> accountId field removed (device itself preserved)
 *
 * Note: Blob sprite deletion (S-025b) and recovery code deletion (S-025c) are
 * deferred for MVP. Only KV data is deleted here.
 *
 * Requires a valid session cookie or Authorization Bearer header.
 * Returns 204 on success.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  if (req.method !== 'DELETE') {
    return jsonResponse({ error: { code: 'method_not_allowed', message: 'Only DELETE is supported' } }, 405);
  }

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

    // Load account record to find linked devices and aquarium
    const account = await kv.get(`account:${accountId}`);

    const linkedDeviceIds = account?.linkedDeviceIds || [];
    const aquariumId = account?.aquariumId;

    // Delete all device → account links and strip accountId from device records
    const deviceOps = linkedDeviceIds.map(async (deviceId) => {
      await kv.del(`deviceAccountLink:${deviceId}`);
      const device = await kv.get(`device:${deviceId}`);
      if (device) {
        // eslint-disable-next-line no-unused-vars
        const { accountId: _removed, ...deviceWithoutAccount } = device;
        await kv.set(`device:${deviceId}`, deviceWithoutAccount);
      }
    });
    await Promise.all(deviceOps);

    // Delete aquarium data if mapped
    if (aquariumId) {
      await Promise.all([
        kv.del(`aquarium:${aquariumId}`),
        kv.del(`owner:${aquariumId}`),
      ]);
    }

    // Delete the account record itself
    await kv.del(`account:${accountId}`);
  } catch (err) {
    const code = err.code === 'backend_unavailable' ? 'backend_unavailable' : 'internal_error';
    const status = code === 'backend_unavailable' ? 503 : 500;
    return jsonResponse({ error: { code, message: err.message } }, status);
  }

  console.log(JSON.stringify({
    ts: now,
    level: 'info',
    route: '/api/account',
    event: 'auth_account_delete',
    accountId,
  }));

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
