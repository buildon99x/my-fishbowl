import { getEnabledProviders } from '../_lib/oauth.js';

/**
 * GET /api/auth/config
 *
 * Returns the list of enabled OAuth providers.
 * Always returns 200 — no auth required.
 * Returns { providers: [] } when no providers are configured.
 *
 * @param {Request} _req
 * @returns {Response}
 */
export default function handler(_req) {
  const providers = getEnabledProviders();
  return new Response(JSON.stringify({ providers }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
