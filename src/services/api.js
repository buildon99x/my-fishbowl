import { getOrCreateDeviceId } from '../lib/deviceId.js';

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL != null
  ? import.meta.env.VITE_API_BASE_URL
  : '';

/**
 * Application-level HTTP error thrown by apiFetch on non-2xx responses.
 */
export class ApiError extends Error {
  /**
   * @param {number} status  - HTTP status code
   * @param {string} code    - Machine-readable error code from response body
   * @param {string} message - Human-readable description
   * @param {unknown} [body] - Full parsed response body (may be undefined)
   */
  constructor(status, code, message, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/**
 * Single HTTP entry point for all server calls.
 *
 * - Automatically attaches `X-Device-Id` header.
 * - Serialises `init.body` to JSON when it is a plain object.
 * - Parses JSON response bodies.
 * - Converts non-2xx responses to `ApiError`.
 *
 * @param {string} path                          - Path relative to VITE_API_BASE_URL (e.g. "/api/aquarium")
 * @param {RequestInit & { body?: unknown }} [init] - Fetch init options; body can be any JSON-serialisable value
 * @returns {Promise<unknown>}                   - Parsed response body
 */
export async function apiFetch(path, init = {}) {
  const deviceId = getOrCreateDeviceId();

  const headers = new Headers(init.headers);
  headers.set('X-Device-Id', deviceId);

  let body;
  if (init.body !== undefined && init.body !== null && typeof init.body === 'object' && !(init.body instanceof Blob) && !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  } else {
    body = init.body;
  }

  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...init,
    headers,
    body,
  });

  let parsed;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      parsed = await response.json();
    } catch {
      parsed = undefined;
    }
  } else {
    parsed = undefined;
  }

  if (!response.ok) {
    const code = parsed?.error?.code ?? String(response.status);
    const message = parsed?.error?.message ?? response.statusText;
    throw new ApiError(response.status, code, message, parsed);
  }

  return parsed;
}
