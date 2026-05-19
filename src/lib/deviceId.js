const DEVICE_ID_KEY = 'my-fishbowl:deviceId';

/**
 * Returns the stored device ID, creating and persisting a new UUID v4 if
 * none exists yet.
 *
 * @returns {string} UUID v4 device ID
 */
export function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const newId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

/**
 * Overwrites the stored device ID with the given value.
 * Used when the server issues a canonical ID (e.g. after account merge).
 *
 * @param {string} newId - New UUID v4 to persist
 */
export function rotateDeviceId(newId) {
  localStorage.setItem(DEVICE_ID_KEY, newId);
}

/**
 * Removes the device ID from localStorage.
 * Primarily used in tests and account-delete flows.
 */
export function clearDeviceId() {
  localStorage.removeItem(DEVICE_ID_KEY);
}
