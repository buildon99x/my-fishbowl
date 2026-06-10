import { getOrCreateDeviceId } from '../lib/deviceId.js';

function readEnv(key) {
  try {
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
}

export const BACKEND_ENABLED = readEnv('VITE_BACKEND_ENABLED') === 'true';

const API_BASE = readEnv('VITE_API_BASE') ?? '';

export class ApiError extends Error {
  constructor(status, code, message, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch(path, init = {}) {
  const headers = {
    'X-Device-Id': getOrCreateDeviceId(),
    ...(init.headers ?? {}),
  };

  let payload = init.body;
  if (payload !== undefined && typeof payload !== 'string') {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    payload = JSON.stringify(payload);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      body: payload,
    });
  } catch (error) {
    throw new ApiError(0, 'network_error', error?.message ?? 'Network request failed', null);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const code = body?.code ?? `http_${response.status}`;
    const message = body?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, code, message, body);
  }

  return { data: body, etag: response.headers.get('ETag'), status: response.status };
}
