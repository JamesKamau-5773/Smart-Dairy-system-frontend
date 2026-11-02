import { authCopy } from '../i18n/auth.en';
import { isEmail } from './identifier';
import { normalizeKenyanPhone } from './phone';
import { getPasswordViolations } from './passwordStrength';

// Client-side checks for the auth forms. Each returns `{ field: message }`;
// an empty object means the form can be sent. The server re-checks everything.

const { fields, password: passwordCopy, register: registerCopy } = authCopy;

function passwordError(value, personal) {
  const [first] = getPasswordViolations(value, personal);
  return first ? passwordCopy.errors[first] : undefined;
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateRegistration(form, { isOwnerSetup = false } = {}) {
  const personal = { phone: normalizeKenyanPhone(form.phone_number), email: form.email };
  return compact({
    full_name: isOwnerSetup && !form.full_name.trim() ? fields.fullNameRequired : undefined,
    farm_name: !isOwnerSetup && !form.farm_name.trim() ? fields.farmNameRequired : undefined,
    phone_number: normalizeKenyanPhone(form.phone_number) ? undefined : fields.phoneInvalid,
    email: form.email?.trim() && !isEmail(form.email) ? fields.emailInvalid : undefined,
    password: passwordError(form.password, personal),
    bootstrap_key: isOwnerSetup && !form.bootstrap_key.trim() ? registerCopy.setupCodeRequired : undefined,
  });
}

export function validateGoogleSignup(form) {
  return compact({
    farm_name: form.farm_name.trim() ? undefined : fields.farmNameRequired,
    phone_number: normalizeKenyanPhone(form.phone_number) ? undefined : fields.phoneInvalid,
  });
}

export function validatePhone(value) {
  return compact({ phone_number: normalizeKenyanPhone(value) ? undefined : fields.phoneInvalid });
}

export function validateEmail(value) {
  return compact({ email: isEmail(value) ? undefined : fields.emailInvalid });
}

export function validateNewPassword({ password, confirm_password: confirmPassword }) {
  return compact({
    password: passwordError(password),
    confirm_password: password && confirmPassword !== password ? fields.passwordMismatch : undefined,
  });
}
