import { ApiError, apiFetch } from '../../../services/api.js';

const BACKEND_ENABLED = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_ENABLED === 'true';

/**
 * Fetches the current aquarium from the server.
 *
 * @returns {Promise<{ aquarium: object, etag: string } | null>}
 *   Returns null when the server has no aquarium for this device
 *   (404 / 204) or when BACKEND_ENABLED is false.
 */
export async function fetchAquarium() {
  if (!BACKEND_ENABLED) return null;

  try {
    const result = await apiFetch('/api/aquarium');
    if (!result || !result.aquarium) return null;
    return { aquarium: result.aquarium, etag: result.etag ?? null };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 204)) {
      return null;
    }
    throw err;
  }
}

/**
 * Uploads the aquarium to the server using optimistic concurrency (ETag).
 *
 * @param {object} aquarium - The aquarium object to persist
 * @param {string | null} etag - ETag from the last successful GET/PUT
 * @returns {Promise<{ etag: string }>}
 * @throws {ApiError} On 412 (etag mismatch) or other server errors
 */
export async function putAquarium(aquarium, etag) {
  if (!BACKEND_ENABLED) return { etag: etag ?? '' };

  const headers = {};
  if (etag) headers['If-Match'] = etag;

  const result = await apiFetch('/api/aquarium', {
    method: 'PUT',
    body: { aquarium },
    headers,
  });

  return { etag: result?.etag ?? '' };
}
