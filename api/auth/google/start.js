import { generateState, generateCodeVerifier } from 'arctic';
import { SignJWT } from 'jose';
import { getRequestContext } from '../../_lib/context.js';
import { isGoogleEnabled, createGoogleClient } from '../../_lib/oauth.js';

/**
 * Cookie name for the OAuth state payload.
 * Uses __Host- prefix in production (requires Secure/HTTPS).
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
 * GET /api/auth/google/start
 *
 * Initiates the Google OAuth flow with PKCE.
 * Requires X-Device-Id header.
 * Stores state, codeVerifier, and deviceId in a signed 10-minute cookie.
 * Redirects to Google's authorization URL.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  if (!isGoogleEnabled()) {
    return new Response(null, { status: 404 });
  }

  const ctx = getRequestContext(req);
  if (ctx.error) {
    return new Response(
      JSON.stringify({ error: { code: ctx.error.code, message: ctx.error.message } }),
      { status: ctx.error.status, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { deviceId } = ctx;

  const google = createGoogleClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const scopes = ['openid'];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);

  // Sign a short-lived JWT to bind state, codeVerifier, and deviceId
  const stateCookieToken = await new SignJWT({ state, codeVerifier, deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getSecret());

  const isProduction = process.env.VERCEL_ENV === 'production';
  const cookieAttr = isProduction
    ? `${STATE_COOKIE_NAME}=${stateCookieToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`
    : `${STATE_COOKIE_NAME}=${stateCookieToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': cookieAttr,
      'Cache-Control': 'no-store',
    },
  });
}
