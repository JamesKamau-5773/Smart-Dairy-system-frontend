import { errorsCopy } from '../i18n/errors';

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

// Plan, subscription and demo refusals (BACKEND_REQUESTS.md, BR-014), by `code`. The backend
// decides when they apply; errorsCopy.plan holds only the words the farmer sees.
const DEMO_CODES = new Set(['DEMO_READ_ONLY', 'DEMO_FEATURE_UNAVAILABLE']);
const PLAN_CODES = new Set(['PLAN_LIMIT_REACHED', 'FEATURE_NOT_IN_PLAN', 'SUBSCRIPTION_EXPIRED', ...DEMO_CODES]);

/** True when the backend refused a request because this is the public demo (403 + demo code). */
export function isDemoRefusal(error) {
  return error?.response?.status === 403 && DEMO_CODES.has(getApiErrorCode(error));
}

/**
 * A clear message for a plan, subscription or demo refusal (402/403 with one of the codes
 * above), or null for any other error.
 */
export function getPlanErrorMessage(error) {
  const code = getApiErrorCode(error);
  const status = error?.response?.status;
  if (!PLAN_CODES.has(code) || (status !== 402 && status !== 403)) return null;
  const { limit, resource } = getApiErrorBody(error);
  if (code === 'PLAN_LIMIT_REACHED' && Number.isFinite(Number(limit)) && typeof resource === 'string' && resource) {
    return errorsCopy.plan.planLimitFor(Number(limit), resource);
  }
  return errorsCopy.plan[code];
}
