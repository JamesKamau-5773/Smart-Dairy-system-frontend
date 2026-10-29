const FIELD_LABELS = {
  farm_name: 'Farm name',
  full_name: 'Full name',
  phone: 'Phone number',
  phone_number: 'Phone number',
  username: 'Username',
  password: 'Password',
  bootstrap_key: 'Owner setup code',
  bootstrap_code: 'Owner setup code',
};

const TECHNICAL_ERROR = /sql|database|constraint|integrity|traceback|exception|stack trace|foreign key|not null|unique key|relation .* does not exist|column .* does not exist|sqlalchemy|sqlite|psycopg/i;

function getSafeServerMessage(data) {
  const candidate = typeof data === 'string'
    ? data
    : data?.message ?? data?.error ?? data?.detail;
  const message = typeof candidate === 'string' ? candidate.trim() : '';

  if (!message || message.length > 240 || TECHNICAL_ERROR.test(message)) return null;
  return message;
}

function getFieldErrors(data) {
  const errors = data?.field_errors ?? data?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null;

  const messages = Object.entries(errors)
    .slice(0, 4)
    .map(([field, detail]) => {
      const label = FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
      const detailText = Array.isArray(detail) ? detail[0] : detail;
      const safeDetail = typeof detailText === 'string' && !TECHNICAL_ERROR.test(detailText)
        ? detailText.trim()
        : '';
      return safeDetail ? `${label}: ${safeDetail}` : `Check the ${label.toLowerCase()} field.`;
    });

  return messages.length ? messages.join(' ') : null;
}

export function getAuthErrorMessage(error, flow) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (!error?.response) {
    return 'We couldn’t connect to Jivu. Check your internet connection and try again.';
  }

  if (flow === 'login' && [401, 403].includes(status)) {
    return 'Those sign-in details didn’t match an active account. Check your username or phone number and password, then try again. If you were invited, activate your account from the invite link first.';
  }

  if (flow === 'bootstrap' && [401, 403].includes(status)) {
    return 'The owner setup code could not be verified. Check the code provided by your platform administrator and try again.';
  }

  if (flow === 'bootstrap' && [404, 409, 410].includes(status)) {
    return 'Initial platform setup is no longer available. Sign in with the platform administrator account.';
  }

  if (status === 429) {
    return 'There have been too many attempts. Wait a moment, then try again.';
  }

  if (flow === 'register' && status === 409) {
    return 'A farm or account may already use these details. Check the phone number, or sign in if you already have an account.';
  }

  if ([400, 422].includes(status)) {
    return getFieldErrors(data)
      ?? getSafeServerMessage(data)
      ?? 'Some details need attention. Review the labeled fields and try again.';
  }

  if (status >= 500) {
    if (flow === 'login') return 'We couldn’t sign you in right now. Please try again shortly.';
    if (flow === 'claim') return 'We couldn’t activate your account right now. Please try again shortly.';
    if (flow === 'passwordReset') return 'We couldn’t update your password right now. Please try again shortly.';
    return 'We couldn’t complete that request right now. Please try again shortly.';
  }

  return getSafeServerMessage(data)
    ?? ({
      login: 'We couldn’t sign you in. Check your username or phone number and password, then try again.',
      claim: 'We couldn’t activate your account. Reopen the invite link and check the details you entered.',
      passwordReset: 'We couldn’t update your password. Check the password requirements and try again.',
      bootstrap: 'We couldn’t complete platform setup. Review the details and try again.',
      register: 'We couldn’t create the account. Review the fields and try again. If the problem continues, contact support.',
    }[flow] ?? 'We couldn’t complete that request. Please try again.');
}
