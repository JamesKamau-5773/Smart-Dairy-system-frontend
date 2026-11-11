/**
 * Words for failed requests, chosen by the backend's error `code` (and per-field reason codes),
 * never by the backend's English `error` text. Used by getApiErrorMessage, the plan messages,
 * the offline messages and useServerFieldErrors.
 */
export const errorsCopy = {
  network: 'We couldn’t reach the server. Check your connection and try again.',
  generic: 'Something went wrong. Please try again.',
  fallback: 'Could not complete this request. Please try again shortly.',
  server: 'The service is temporarily unavailable. Please try again shortly.',
  validation: 'Some information is missing or needs correction. Review the form fields and try again.',
  conflict: 'A record with these details already exists. Check the existing records and try again.',
  unauthenticated: 'Your session may have expired. Sign in again, then retry.',
  forbidden: 'You don’t have access to do that. Check that you’re in the right farm or ask your farm administrator.',
  notFound: 'This item may no longer be available. Refresh the page and try again.',
  rateLimited: 'Too many attempts were made. Wait a moment, then try again.',

  // By backend `code`. Codes that only say what kind of failure it was (VALIDATION_ERROR,
  // CONFLICT, NOT_FOUND) use the status messages above instead.
  codes: {
    DUPLICATE_MILK_ENTRY: 'This cow already has a milk record for that date and session. Edit that record instead.',
    INSUFFICIENT_STOCK: 'There isn’t enough stock for this. Restock or use a smaller amount.',
    ITEM_IN_USE: 'This item is used by saved feed mixes, batches or stock history, so it can’t be deleted. Archive it instead.',
    ATTACHMENT_LIMIT: 'This entry already has the most receipt photos allowed. Remove one to add another.',
    EMPLOYEE_OFFBOARDED: 'Advances can’t be given to someone who has left.',
    ALREADY_OFFBOARDED: 'This employee has already left.',
    LOAN_OUTSTANDING: 'This employee still owes advances. Record the repayment, or recover it in a final payroll, before they leave.',
    PAYROLL_NOT_FINALIZED: 'Payslips are ready once the payroll run is finalised.',
    BALANCE_CHANGE_REQUIRES_ADVANCE: 'Change the advance balance by giving an advance or recording a repayment.',
    STOCK_CHANGE_REQUIRES_MOVEMENT: 'Stock changes only through Restock, Use or Stock Count, so every change is recorded.',
    PHONE_VERIFICATION_REQUIRED: 'Verify your phone number to continue.',
    PASSWORD_RESET_REQUIRED: 'Set a new password to continue.',
    IDEMPOTENCY_IN_PROGRESS: 'This is still being saved. Wait a moment before trying again.',
    IDEMPOTENCY_KEY_REUSED: 'These details changed while the first save was still being sent. Check the record, then save again.',
    INVALID_IDEMPOTENCY_KEY: 'This couldn’t be saved. Please try again.',
    RATE_LIMITED: 'Too many attempts were made. Wait a moment, then try again.',
  },

  plan: {
    PLAN_LIMIT_REACHED: 'Your plan’s limit for this has been reached. Upgrade your plan to add more. Nothing you already saved is affected.',
    planLimitFor: (limit, resource) => `Your plan allows ${limit} ${resource}. Upgrade your plan to add more. Nothing you already saved is affected.`,
    FEATURE_NOT_IN_PLAN: 'This isn’t included in your plan. Upgrade your plan to use it.',
    SUBSCRIPTION_EXPIRED: 'Your subscription has ended, so this wasn’t saved. Renew it to keep recording. Your records are safe.',
    DEMO_READ_ONLY: 'This is the demo farm, so this change can’t be saved. Create your own farm account to keep records.',
  },

  offline: {
    queued: 'Saved on this phone. It will be sent when you’re back online.',
    failed: (whatDidNotHappen) => `No internet connection. ${whatDidNotHappen} Try again when you’re back online.`,
  },

  // Per-field reasons, by the reason code the backend sends in `fields` (e.g. `{ amount: 'required' }`).
  fieldReasons: {
    required: 'This is required.',
    invalid: 'Check this value.',
    too_long: 'This is too long.',
    too_short: 'This is too short.',
    too_large: 'This is too large.',
    too_small: 'This is too small.',
    must_be_positive: 'Enter a number above 0.',
    in_future: 'This date can’t be in the future.',
    duplicate: 'This is already used.',
    not_found: 'This no longer exists. Choose another.',
  },
  checkField: 'Check this field.',
};
