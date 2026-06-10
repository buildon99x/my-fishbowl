import { apiFetch } from '../../../services/api.js';

const AQUARIUM_PATH = '/api/aquarium';

// Returns { aquarium, etag } when present, or { aquarium: null, etag: null }
// when the server has no aquarium for this device (204 / 404).
export async function fetchAquarium() {
  const { data, etag, status } = await apiFetch(AQUARIUM_PATH, { method: 'GET' });

  if (status === 204 || data == null) {
    return { aquarium: null, etag: null };
  }

  return { aquarium: data, etag };
}

// PUT with optimistic concurrency via If-Match. Returns { aquarium, etag }.
// A 412 from the server surfaces as an ApiError with status 412 (conflict).
export async function putAquarium(aquarium, etag) {
  const headers = {};
  if (etag) {
    headers['If-Match'] = etag;
  }

  const { data, etag: nextEtag } = await apiFetch(AQUARIUM_PATH, {
    method: 'PUT',
    headers,
    body: aquarium,
  });

  return { aquarium: data ?? aquarium, etag: nextEtag ?? null };
}
