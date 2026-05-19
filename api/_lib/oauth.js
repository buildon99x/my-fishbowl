import { Google } from 'arctic';

/**
 * Returns true when Google OAuth credentials are present in the environment.
 *
 * @returns {boolean}
 */
export function isGoogleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Creates a configured arctic Google client using environment variables.
 * Throws if the required env vars are absent.
 *
 * @returns {Google}
 */
export function createGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.PUBLIC_BASE_URL || '';
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  return new Google(clientId, clientSecret, callbackUrl);
}

/**
 * Returns an array of enabled OAuth provider names based on current environment.
 * Apple is deferred (MVP = Google only).
 *
 * @returns {string[]}
 */
export function getEnabledProviders() {
  const providers = [];
  if (isGoogleEnabled()) {
    providers.push('google');
  }
  return providers;
}
