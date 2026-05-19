/**
 * api/aquarium.test.js
 *
 * Unit tests for the GET /api/aquarium and PUT /api/aquarium Vercel Function.
 * The @vercel/kv client and the _lib/kv.js helpers are mocked so that no
 * real KV connection is needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @vercel/kv before importing anything that depends on it
// ---------------------------------------------------------------------------
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock the environment guard so isKvConfigured() returns true in tests.
vi.mock('./_lib/envGuard.js', () => ({
  assertNotProduction: vi.fn(() => null),
  isKvConfigured: vi.fn(() => true),
}));

// Mock all KV helper functions used by aquarium.js
const mockGetDevice = vi.fn();
const mockGetOwner = vi.fn();
const mockGetAquarium = vi.fn();
const mockSetAquarium = vi.fn();
const mockSetOwner = vi.fn();
const mockSetDevice = vi.fn();

vi.mock('./_lib/kv.js', () => ({
  getKv: vi.fn(() => ({})),
  getAquarium: (...args) => mockGetAquarium(...args),
  setAquarium: (...args) => mockSetAquarium(...args),
  getOwner: (...args) => mockGetOwner(...args),
  setOwner: (...args) => mockSetOwner(...args),
  getDevice: (...args) => mockGetDevice(...args),
  setDevice: (...args) => mockSetDevice(...args),
}));

// Import the handler after all mocks are in place.
const { default: handler } = await import('./aquarium.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_DEVICE_ID = '12345678-1234-4abc-89ab-123456789012';

/**
 * Builds a minimal Request object.
 *
 * @param {'GET'|'PUT'} method
 * @param {Record<string,string>} [headers]
 * @param {unknown} [body]
 * @returns {Request}
 */
function makeReq(method, headers = {}, body = undefined) {
  const init = { method, headers };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request('http://localhost/api/aquarium', init);
}

/**
 * Builds a minimal valid aquarium payload.
 *
 * @param {Partial<object>} overrides
 * @returns {object}
 */
function makeAquarium(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Test Tank',
    fishes: [],
    cleanliness: 100,
    algaeLevel: 0,
    bounds: { width: 800, height: 600 },
    lastCleanedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSetAquarium.mockResolvedValue(undefined);
  mockSetOwner.mockResolvedValue(undefined);
  mockSetDevice.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/aquarium — missing device ID
// ---------------------------------------------------------------------------
describe('GET /api/aquarium', () => {
  it('returns 400 when X-Device-Id header is missing', async () => {
    const req = makeReq('GET');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('missing_device_id');
  });

  it('returns 400 when X-Device-Id is not a valid UUID v4', async () => {
    const req = makeReq('GET', { 'x-device-id': 'not-a-uuid' });
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('missing_device_id');
  });

  it('returns 404 when device has no associated aquarium', async () => {
    mockGetDevice.mockResolvedValue(null);

    const req = makeReq('GET', { 'x-device-id': VALID_DEVICE_ID });
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('aquarium_not_found');
  });

  it('returns 200 with aquarium JSON and ETag on success', async () => {
    const aquariumId = '00000000-0000-4000-8000-000000000001';
    const updatedAt = '2024-06-01T12:00:00.000Z';
    const aquarium = makeAquarium({ id: aquariumId, updatedAt });

    mockGetDevice.mockResolvedValue({ aquariumId, createdAt: updatedAt, lastSeenAt: updatedAt });
    mockGetOwner.mockResolvedValue({ deviceId: VALID_DEVICE_ID });
    mockGetAquarium.mockResolvedValue({ aquarium });

    const req = makeReq('GET', { 'x-device-id': VALID_DEVICE_ID });
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aquarium).toBeDefined();
    expect(body.aquarium.id).toBe(aquariumId);

    const etag = res.headers.get('ETag');
    expect(etag).toBe(`"${updatedAt}"`);
  });

  it('returns 403 when device does not own the aquarium', async () => {
    const aquariumId = '00000000-0000-4000-8000-000000000001';

    mockGetDevice.mockResolvedValue({ aquariumId, createdAt: '2024-01-01T00:00:00.000Z', lastSeenAt: '2024-01-01T00:00:00.000Z' });
    // Owner is a different device
    mockGetOwner.mockResolvedValue({ deviceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });

    const req = makeReq('GET', { 'x-device-id': VALID_DEVICE_ID });
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('owner_changed');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/aquarium
// ---------------------------------------------------------------------------
describe('PUT /api/aquarium', () => {
  it('returns 412 on ETag mismatch', async () => {
    const aquariumId = '00000000-0000-4000-8000-000000000001';
    const serverUpdatedAt = '2024-06-01T12:00:00.000Z';
    const serverAquarium = makeAquarium({ id: aquariumId, updatedAt: serverUpdatedAt });

    // Server has a stored aquarium
    mockGetAquarium.mockResolvedValue({ aquarium: serverAquarium });
    // No device record yet (new device for this test)
    mockGetDevice.mockResolvedValue(null);

    const clientAquarium = makeAquarium({ id: aquariumId, updatedAt: '2024-05-01T00:00:00.000Z' });
    const req = makeReq(
      'PUT',
      {
        'x-device-id': VALID_DEVICE_ID,
        'if-match': '"2024-05-01T00:00:00.000Z"',
        'content-type': 'application/json',
      },
      { aquarium: clientAquarium },
    );

    const res = await handler(req);

    expect(res.status).toBe(412);
    const body = await res.json();
    expect(body.error.code).toBe('etag_mismatch');
    expect(body.serverAquarium).toBeDefined();
  });

  it('returns 200 with new ETag on successful PUT', async () => {
    const aquariumId = '00000000-0000-4000-8000-000000000001';

    // No existing aquarium (first PUT)
    mockGetAquarium.mockResolvedValue(null);
    mockGetDevice.mockResolvedValue(null);

    const aquarium = makeAquarium({ id: aquariumId });
    const req = makeReq(
      'PUT',
      {
        'x-device-id': VALID_DEVICE_ID,
        'content-type': 'application/json',
      },
      { aquarium },
    );

    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aquarium).toBeDefined();
    expect(typeof body.etag).toBe('string');

    const etagHeader = res.headers.get('ETag');
    expect(etagHeader).toBe(`"${body.etag}"`);

    // Verify KV writes were called
    expect(mockSetAquarium).toHaveBeenCalledOnce();
    expect(mockSetOwner).toHaveBeenCalledOnce();
    expect(mockSetDevice).toHaveBeenCalledOnce();
  });

  it('returns 413 when payload exceeds 100KB', async () => {
    // Build a body larger than 100_000 bytes
    const hugeString = 'x'.repeat(100_001);
    const req = makeReq(
      'PUT',
      {
        'x-device-id': VALID_DEVICE_ID,
        'content-type': 'application/json',
      },
      hugeString,
    );

    const res = await handler(req);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('payload_too_large');
  });

  it('returns 400 when X-Device-Id is missing on PUT', async () => {
    const aquarium = makeAquarium({});
    const req = makeReq('PUT', { 'content-type': 'application/json' }, { aquarium });

    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('missing_device_id');
  });

  it('stamps new updatedAt on the saved aquarium', async () => {
    const aquariumId = '00000000-0000-4000-8000-000000000001';
    const clientUpdatedAt = '2024-01-01T00:00:00.000Z';

    mockGetAquarium.mockResolvedValue(null);
    mockGetDevice.mockResolvedValue(null);

    const aquarium = makeAquarium({ id: aquariumId, updatedAt: clientUpdatedAt });
    const req = makeReq(
      'PUT',
      {
        'x-device-id': VALID_DEVICE_ID,
        'content-type': 'application/json',
      },
      { aquarium },
    );

    const before = new Date().toISOString();
    const res = await handler(req);
    const after = new Date().toISOString();

    expect(res.status).toBe(200);
    const body = await res.json();

    // Server-stamped updatedAt should be newer than the client-provided one
    expect(body.aquarium.updatedAt).not.toBe(clientUpdatedAt);
    expect(body.aquarium.updatedAt >= before).toBe(true);
    expect(body.aquarium.updatedAt <= after).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Method routing
// ---------------------------------------------------------------------------
describe('Method routing', () => {
  it('returns 405 for unsupported methods', async () => {
    const req = new Request('http://localhost/api/aquarium', {
      method: 'DELETE',
      headers: { 'x-device-id': VALID_DEVICE_ID },
    });

    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const req = new Request('http://localhost/api/aquarium', {
      method: 'OPTIONS',
    });

    const res = await handler(req);
    expect(res.status).toBe(204);
  });
});
