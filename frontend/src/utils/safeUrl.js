/**
 * A link written by staff is only followed when it is http or https. Returns the cleaned address,
 * or null for anything else (javascript:, data:, a broken string).
 */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export default safeUrl;
