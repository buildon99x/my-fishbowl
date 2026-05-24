const DEVICE_ID_KEY = 'my-fishbowl:deviceId';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 (non-crypto) for environments without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isValidUuidV4(value) {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

export function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (isValidUuidV4(existing)) {
      return existing;
    }
  } catch (error) {
    console.warn('Device ID could not be read.', error);
  }

  const deviceId = generateUuid();

  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    console.warn('Device ID could not be persisted.', error);
  }

  return deviceId;
}

export function rotateDeviceId(newId) {
  const deviceId = isValidUuidV4(newId) ? newId : generateUuid();

  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    console.warn('Device ID could not be rotated.', error);
  }

  return deviceId;
}

export function clearDeviceId() {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Device ID could not be cleared.', error);
  }
}

export { DEVICE_ID_KEY };
