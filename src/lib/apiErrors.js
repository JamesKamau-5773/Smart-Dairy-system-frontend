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
// decides when they apply; these are only the words the farmer sees.
const PLAN_ERROR_MESSAGES = {
  PLAN_LIMIT_REACHED: 'Your plan’s limit for this has been reached. Upgrade your plan to add more. Nothing you already saved is affected.',
  FEATURE_NOT_IN_PLAN: 'This isn’t included in your plan. Upgrade your plan to use it.',
  SUBSCRIPTION_EXPIRED: 'Your subscription has ended, so this wasn’t saved. Renew it to keep recording. Your records are safe.',
  DEMO_READ_ONLY: 'This is the demo farm, so this change can’t be saved. Create your own farm account to keep records.',
};

/**
 * A clear message for a plan, subscription or demo refusal (402/403 with one of the codes
 * above), or null for any other error.
 */
export function getPlanErrorMessage(error) {
  const code = getApiErrorCode(error);
  const status = error?.response?.status;
  if (!code || !PLAN_ERROR_MESSAGES[code] || (status !== 402 && status !== 403)) return null;
  const { limit, resource } = getApiErrorBody(error);
  if (code === 'PLAN_LIMIT_REACHED' && Number.isFinite(Number(limit)) && typeof resource === 'string' && resource) {
    return `Your plan allows ${Number(limit)} ${resource}. Upgrade your plan to add more. Nothing you already saved is affected.`;
  }
  return PLAN_ERROR_MESSAGES[code];
}
