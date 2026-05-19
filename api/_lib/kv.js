import { kv } from '@vercel/kv';
import { isKvConfigured } from './envGuard.js';

/**
 * Returns the KV client instance, throwing if KV is not configured.
 *
 * @returns {import('@vercel/kv').VercelKV}
 */
export function getKv() {
  if (!isKvConfigured()) {
    const err = new Error('KV environment variables are not configured');
    err.code = 'backend_unavailable';
    throw err;
  }
  return kv;
}

/**
 * Retrieves aquarium JSON by aquariumId.
 *
 * @param {string} aquariumId
 * @returns {Promise<object|null>}
 */
export async function getAquarium(aquariumId) {
  return getKv().get(`aquarium:${aquariumId}`);
}

/**
 * Persists aquarium JSON by aquariumId.
 *
 * @param {string} aquariumId
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function setAquarium(aquariumId, data) {
  await getKv().set(`aquarium:${aquariumId}`, data);
}

/**
 * Retrieves the owner record for an aquariumId.
 *
 * @param {string} aquariumId
 * @returns {Promise<{deviceId: string}|null>}
 */
export async function getOwner(aquariumId) {
  return getKv().get(`owner:${aquariumId}`);
}

/**
 * Persists the owner record for an aquariumId.
 *
 * @param {string} aquariumId
 * @param {{ deviceId: string }} ownerData
 * @returns {Promise<void>}
 */
export async function setOwner(aquariumId, ownerData) {
  await getKv().set(`owner:${aquariumId}`, ownerData);
}

/**
 * Retrieves the device record for a deviceId.
 *
 * @param {string} deviceId
 * @returns {Promise<{aquariumId: string, createdAt: string, lastSeenAt: string}|null>}
 */
export async function getDevice(deviceId) {
  return getKv().get(`device:${deviceId}`);
}

/**
 * Persists the device record for a deviceId.
 *
 * @param {string} deviceId
 * @param {{ aquariumId: string, createdAt: string, lastSeenAt: string }} data
 * @returns {Promise<void>}
 */
export async function setDevice(deviceId, data) {
  await getKv().set(`device:${deviceId}`, data);
}
