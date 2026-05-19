import { SignJWT, jwtVerify } from 'jose';

/**
 * The name of the session cookie.
 * Uses __Host- prefix in production (requires Secure/HTTPS).
 * Falls back to a plain name in dev (works on localhost http).
 */
export const SESSION_COOKIE_NAME =
  process.env.VERCEL_ENV === 'production' ? '__Host-mf_session' : 'mf_session';

/**
 * Returns the raw bytes of the AUTH_JWT_SECRET env var for use as a jose key.
 *
 * @returns {Uint8Array}
 */
function getSecret() {
  const raw = process.env.AUTH_JWT_SECRET;
  if (!raw) {
    throw new Error('AUTH_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(raw);
}

/**
 * Signs an HS256 JWT session token with 1-hour expiry.
 *
 * @param {string} accountId - e.g. 'google:sub_value'
 * @param {string} provider  - e.g. 'google'
 * @param {string} deviceId  - UUID v4
 * @returns {Promise<string>} Compact JWT string
 */
export async function createSessionToken(accountId, provider, deviceId) {
  return new SignJWT({ accountId, provider, deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret());
}

/**
 * Verifies a session JWT and returns its claims, or null if invalid/expired.
 * Never throws.
 *
 * @param {string} token
 * @returns {Promise<{accountId: string, provider: string, deviceId: string, iat: number, exp: number}|null>}
 */
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}
