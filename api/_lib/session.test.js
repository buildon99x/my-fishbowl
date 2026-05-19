/**
 * api/_lib/session.test.js
 *
 * Unit tests for JWT session creation and verification.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';

// ---------------------------------------------------------------------------
// Set up AUTH_JWT_SECRET before importing the module under test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubEnv('AUTH_JWT_SECRET', 'test-secret-that-is-long-enough-for-hs256');
  vi.stubEnv('VERCEL_ENV', 'development');
});

// Import after env is stubbed (module-level constants will be evaluated lazily
// because getSecret() is called at signing time, not at import time).
const { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } = await import('./session.js');

const ACCOUNT_ID = 'google:abc123';
const PROVIDER = 'google';
const DEVICE_ID = '12345678-1234-4abc-89ab-123456789012';

// ---------------------------------------------------------------------------
// SESSION_COOKIE_NAME
// ---------------------------------------------------------------------------
describe('SESSION_COOKIE_NAME', () => {
  it('uses plain name in non-production environment', () => {
    // VERCEL_ENV is 'development' per beforeEach stub
    expect(SESSION_COOKIE_NAME).toBe('mf_session');
  });
});

// ---------------------------------------------------------------------------
// createSessionToken
// ---------------------------------------------------------------------------
describe('createSessionToken', () => {
  it('creates a compact JWT string', async () => {
    const token = await createSessionToken(ACCOUNT_ID, PROVIDER, DEVICE_ID);
    expect(typeof token).toBe('string');
    // Compact JWTs have three base64url segments separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('embeds correct claims in the token', async () => {
    const token = await createSessionToken(ACCOUNT_ID, PROVIDER, DEVICE_ID);
    const claims = await verifySessionToken(token);

    expect(claims).not.toBeNull();
    expect(claims.accountId).toBe(ACCOUNT_ID);
    expect(claims.provider).toBe(PROVIDER);
    expect(claims.deviceId).toBe(DEVICE_ID);
  });

  it('sets iat and exp claims', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createSessionToken(ACCOUNT_ID, PROVIDER, DEVICE_ID);
    const after = Math.floor(Date.now() / 1000);

    const claims = await verifySessionToken(token);
    expect(claims.iat).toBeGreaterThanOrEqual(before);
    expect(claims.iat).toBeLessThanOrEqual(after);
    // exp should be ~1 hour (3600s) after iat
    expect(claims.exp).toBeGreaterThanOrEqual(claims.iat + 3590);
    expect(claims.exp).toBeLessThanOrEqual(claims.iat + 3610);
  });
});

// ---------------------------------------------------------------------------
// verifySessionToken
// ---------------------------------------------------------------------------
describe('verifySessionToken', () => {
  it('returns claims for a valid token', async () => {
    const token = await createSessionToken(ACCOUNT_ID, PROVIDER, DEVICE_ID);
    const claims = await verifySessionToken(token);

    expect(claims).not.toBeNull();
    expect(claims.accountId).toBe(ACCOUNT_ID);
  });

  it('returns null for an invalid signature', async () => {
    // Tamper with the signature segment
    const token = await createSessionToken(ACCOUNT_ID, PROVIDER, DEVICE_ID);
    const parts = token.split('.');
    parts[2] = 'invalidsignature';
    const tampered = parts.join('.');

    const result = await verifySessionToken(tampered);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    // Build a token that expired in the past using jose directly
    const secret = new TextEncoder().encode('test-secret-that-is-long-enough-for-hs256');
    const expired = await new SignJWT({ accountId: ACCOUNT_ID, provider: PROVIDER, deviceId: DEVICE_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret);

    const result = await verifySessionToken(expired);
    expect(result).toBeNull();
  });

  it('returns null for a completely invalid string', async () => {
    const result = await verifySessionToken('not.a.jwt');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifySessionToken('');
    expect(result).toBeNull();
  });
});
