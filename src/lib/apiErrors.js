// The backend's error envelope: `{ code, error, ...extra }`. Branch on `code`,
// never on the `error` text, which is meant for people and may change.

/** The machine-readable `code` of a failed request, or null. */
export function getApiErrorCode(error) {
  const code = error?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}

/** The response body of a failed request (for extra fields such as `can_archive`), or {}. */
export function getApiErrorBody(error) {
  const data = error?.response?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
