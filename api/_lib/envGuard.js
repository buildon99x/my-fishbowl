/**
 * Returns a 404 Response if running in production (for dev-only routes).
 * Returns null if the environment check passes.
 *
 * @returns {Response|null}
 */
export function assertNotProduction() {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response(null, { status: 404 });
  }
  return null;
}

/**
 * Returns true if the required KV environment variables are configured.
 *
 * @returns {boolean}
 */
export function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
