/** UUID v4 pattern */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Extracts and validates the X-Device-Id header from a request.
 *
 * @param {Request} req
 * @returns {{ deviceId: string } | { error: { status: number, code: string, message: string } }}
 */
export function getRequestContext(req) {
  const deviceId = req.headers.get('x-device-id') || req.headers.get('X-Device-Id');

  if (!deviceId || !UUID_V4_REGEX.test(deviceId)) {
    return {
      error: {
        status: 400,
        code: 'missing_device_id',
        message: 'X-Device-Id header is required and must be a valid UUID v4',
      },
    };
  }

  return { deviceId };
}
