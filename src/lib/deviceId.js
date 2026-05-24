const DEVICE_ID_KEY = 'my-fishbowl:deviceId';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 using crypto.getRandomValues (CSPRNG safe).
  const b = new Uint8Array(16);
  (crypto ?? globalThis.crypto).getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
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
