import { decodeIdToken } from 'arctic';
import { jwtVerify } from 'jose';
import { isGoogleEnabled, createGoogleClient } from '../../_lib/oauth.js';
import { createSessionToken, SESSION_COOKIE_NAME } from '../../_lib/session.js';
import { getKv } from '../../_lib/kv.js';

/**
 * Cookie name for the OAuth state payload (must match start.js).
 */
const STATE_COOKIE_NAME =
  process.env.VERCEL_ENV === 'production' ? '__Host-mf_oauth_state' : 'mf_oauth_state';

/**
 * Returns the raw bytes of AUTH_JWT_SECRET for jose.
 *
 * @returns {Uint8Array}
 */
function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_JWT_SECRET);
}

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
 * Builds a redirect Response to the error URL.
 *
 * @param {string} code
 * @returns {Response}
 */
function redirectError(code) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/?auth=error&code=${encodeURIComponent(code)}`,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth callback:
 * 1. Validates OAuth state cookie (prevents CSRF).
 * 2. Exchanges authorization code for tokens via arctic.
 * 3. Extracts only the `sub` claim from the ID token.
 * 4. Creates or retrieves the account record in KV.
 * 5. Links the device to the account.
 * 6. Issues a session JWT and sets the session cookie.
 * 7. Redirects to /?auth=success.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  if (!isGoogleEnabled()) {
    return new Response(null, { status: 404 });
  }

  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get('code');
  const returnedState = reqUrl.searchParams.get('state');

  // Parse OAuth state cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const stateCookieToken = cookies[STATE_COOKIE_NAME];

  if (!stateCookieToken) {
    return redirectError('oauth_state_invalid');
  }

  // Verify and decode the signed state cookie
  let statePayload;
  try {
    const { payload } = await jwtVerify(stateCookieToken, getSecret(), { algorithms: ['HS256'] });
    statePayload = payload;
  } catch {
    return redirectError('oauth_state_invalid');
  }

  const { state: expectedState, codeVerifier, deviceId } = statePayload;

  // Validate state to prevent CSRF
  if (!returnedState || returnedState !== expectedState) {
    return redirectError('oauth_state_invalid');
  }

  if (!code) {
    return redirectError('oauth_code_missing');
  }

  // Exchange code for tokens
  let tokens;
  try {
    const google = createGoogleClient();
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    return redirectError('oauth_token_exchange_failed');
  }

  // Extract ONLY sub from the ID token — never store email/name/picture
  let sub;
  try {
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken);
    sub = claims.sub;
  } catch {
    return redirectError('oauth_id_token_invalid');
  }

  if (!sub) {
    return redirectError('oauth_id_token_invalid');
  }

  const accountId = `google:${sub}`;
  const now = new Date().toISOString();

  // Persist account and device linkage
  try {
    const kv = getKv();

    // Load device first so we can include aquariumId on the account record
    const device = await kv.get(`device:${deviceId}`);
    const deviceAquariumId = device?.aquariumId;

    // Create account record if it does not exist yet
    const existingAccount = await kv.get(`account:${accountId}`);
    if (!existingAccount) {
      await kv.set(`account:${accountId}`, {
        provider: 'google',
        sub,
        linkedAt: now,
        linkedDeviceIds: [deviceId],
        ...(deviceAquariumId ? { aquariumId: deviceAquariumId } : {}),
      });
    } else {
      // Add deviceId if not already linked; always sync aquariumId
      const linkedDeviceIds = existingAccount.linkedDeviceIds || [];
      if (!linkedDeviceIds.includes(deviceId)) {
        linkedDeviceIds.push(deviceId);
      }
      const aquariumId = deviceAquariumId ?? existingAccount.aquariumId;
      await kv.set(`account:${accountId}`, {
        ...existingAccount,
        linkedDeviceIds,
        ...(aquariumId ? { aquariumId } : {}),
      });
    }

    // Link device → account
    await kv.set(`deviceAccountLink:${deviceId}`, accountId);

    // Update owner record to include accountId if aquarium is known for device
    if (deviceAquariumId) {
      const owner = await kv.get(`owner:${deviceAquariumId}`);
      if (owner) {
        await kv.set(`owner:${deviceAquariumId}`, { ...owner, accountId });
      }
    }
  } catch {
    return redirectError('oauth_link_failed');
  }

  // Issue session JWT (1h)
  const sessionToken = await createSessionToken(accountId, 'google', deviceId);

  // Clear the state cookie and set the session cookie
  const isProduction = process.env.VERCEL_ENV === 'production';

  const clearStateCookie = isProduction
    ? `${STATE_COOKIE_NAME}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`
    : `${STATE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  const sessionCookie = isProduction
    ? `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600`
    : `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`;

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ['Location', '/?auth=success'],
      ['Set-Cookie', clearStateCookie],
      ['Set-Cookie', sessionCookie],
      ['Cache-Control', 'no-store'],
    ]),
  });
}
