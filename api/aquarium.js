import { getRequestContext } from './_lib/context.js';
import { getAquarium, setAquarium, getOwner, setOwner, getDevice, setDevice } from './_lib/kv.js';
import { putAquariumBodySchema } from './_lib/schema.js';

const PAYLOAD_LIMIT = 100_000;

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
    res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id, If-Match');
  }
  return res;
}

/**
 * Emit a structured log line.
 *
 * @param {{ deviceId?: string, status: number, durationMs: number, error?: string }} fields
 */
function log(fields) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: fields.error ? 'error' : 'info',
      route: '/api/aquarium',
      ...fields,
    }),
  );
}

/**
 * Handle GET /api/aquarium
 *
 * @param {Request} req
 * @param {string} deviceId
 * @returns {Promise<Response>}
 */
async function handleGet(req, deviceId) {
  const device = await getDevice(deviceId);
  if (!device) {
    return jsonResponse({ error: { code: 'aquarium_not_found', message: 'No aquarium found for this device' } }, 404);
  }

  const { aquariumId } = device;

  // Verify ownership
  const owner = await getOwner(aquariumId);
  if (!owner || owner.deviceId !== deviceId) {
    return jsonResponse({ error: { code: 'owner_changed', message: 'This device no longer owns the aquarium' } }, 403);
  }

  const stored = await getAquarium(aquariumId);
  if (!stored) {
    return jsonResponse({ error: { code: 'aquarium_not_found', message: 'Aquarium data not found' } }, 404);
  }

  const etag = stored.aquarium?.updatedAt ?? stored.updatedAt;

  return jsonResponse({ aquarium: stored.aquarium ?? stored }, 200, {
    ETag: `"${etag}"`,
  });
}

/**
 * Handle PUT /api/aquarium
 *
 * @param {Request} req
 * @param {string} deviceId
 * @returns {Promise<Response>}
 */
async function handlePut(req, deviceId) {
  // Read and size-check payload
  const rawBody = await req.text();
  if (rawBody.length > PAYLOAD_LIMIT) {
    return jsonResponse({ error: { code: 'payload_too_large', message: 'Payload exceeds 100KB limit' } }, 413);
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: { code: 'invalid_json', message: 'Request body must be valid JSON' } }, 400);
  }

  // Validate schema
  const parseResult = putAquariumBodySchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return jsonResponse(
      { error: { code: 'invalid_payload', message: parseResult.error.message } },
      400,
    );
  }

  const { aquarium } = parseResult.data;
  const { id: aquariumId } = aquarium;

  // Load existing data for ETag check
  const existing = await getAquarium(aquariumId);
  const existingAquarium = existing?.aquarium ?? existing;

  if (existingAquarium) {
    const serverUpdatedAt = existingAquarium.updatedAt;
    const ifMatch = req.headers.get('if-match') || req.headers.get('If-Match');

    // Strip surrounding quotes from If-Match if present
    const clientEtag = ifMatch ? ifMatch.replace(/^"|"$/g, '') : null;

    if (clientEtag !== serverUpdatedAt) {
      return jsonResponse(
        {
          error: { code: 'etag_mismatch', message: 'ETag mismatch — another client has updated this aquarium' },
          serverAquarium: existingAquarium,
        },
        412,
      );
    }

    // Verify ownership for existing aquariums
    const owner = await getOwner(aquariumId);
    if (owner && owner.deviceId !== deviceId) {
      return jsonResponse(
        { error: { code: 'owner_changed', message: 'This device does not own this aquarium' } },
        403,
      );
    }
  }

  // Server stamps updatedAt
  const now = new Date().toISOString();
  const savedAquarium = { ...aquarium, updatedAt: now };

  // Upsert all three KV keys
  const existingDevice = await getDevice(deviceId);
  const createdAt = existingDevice?.createdAt ?? now;

  await Promise.all([
    setAquarium(aquariumId, { aquarium: savedAquarium }),
    setOwner(aquariumId, { deviceId }),
    setDevice(deviceId, { aquariumId, createdAt, lastSeenAt: now }),
  ]);

  return jsonResponse({ aquarium: savedAquarium, etag: now }, 200, {
    ETag: `"${now}"`,
  });
}

/**
 * Vercel Function handler — Web API style.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function handler(req) {
  const start = Date.now();
  const method = req.method?.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  if (method !== 'GET' && method !== 'PUT') {
    const res = jsonResponse({ error: { code: 'method_not_allowed', message: 'Only GET and PUT are supported' } }, 405);
    return withCors(res);
  }

  // Extract device context
  const ctx = getRequestContext(req);
  if (ctx.error) {
    const res = jsonResponse({ error: { code: ctx.error.code, message: ctx.error.message } }, ctx.error.status);
    log({ status: ctx.error.status, durationMs: Date.now() - start, error: ctx.error.code });
    return withCors(res);
  }

  const { deviceId } = ctx;
  let res;

  try {
    if (method === 'GET') {
      res = await handleGet(req, deviceId);
    } else {
      res = await handlePut(req, deviceId);
    }
  } catch (err) {
    const code = err.code === 'backend_unavailable' ? 'backend_unavailable' : 'internal_error';
    const status = code === 'backend_unavailable' ? 503 : 500;
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', route: '/api/aquarium', error: err.message }));
    res = jsonResponse({ error: { code, message: err.message } }, status);
  }

  log({ deviceId, status: res.status, durationMs: Date.now() - start });
  return withCors(res);
}
