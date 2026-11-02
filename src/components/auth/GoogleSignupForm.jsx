import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../ui/AlertBanner';
import GoogleSignInButton from './GoogleSignInButton';
import SubmitButton from './SubmitButton';
import { PhoneField, TextField } from './AuthFields';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { authApi } from '../../lib/backendApi';
import { getGateRoute, safeNextPath } from '../../lib/authState';
import { normalizeKenyanPhone } from '../../lib/phone';
import { validateGoogleSignup } from '../../lib/authValidation';
import { authCopy } from '../../i18n/auth.en';

const { google: copy, fields } = authCopy;
const FIELD_ORDER = ['name', 'farm_name', 'phone_number'];

/**
 * Second half of a Google sign-up: Google gave us a verified email, the farmer
 * adds a farm and phone (AUTH_API_CONTRACT §5, result=signup_required).
 */
export default function GoogleSignupForm({ next, online }) {
  const navigate = useNavigate();
  const { updateSession } = useAuth();
  const [pending, setPending] = useState({ status: 'loading', data: null });
  const [form, setForm] = useState({ name: '', farm_name: '', phone_number: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const load = useAsyncAction(authApi.googlePendingSignup, 'googleSignup');
  const signup = useAsyncAction(authApi.googleSignup, 'googleSignup');
  const { run: runLoad } = load;

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    runLoad().then((result) => {
      if (result.ok) {
        setPending({ status: 'ready', data: result.data });
        setForm((current) => ({ ...current, name: result.data?.name ?? '' }));
      } else {
        setPending({ status: result.error.code === 'SIGNUP_SESSION_EXPIRED' ? 'expired' : 'failed', data: null });
      }
    });
  }, [runLoad]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const errors = validateGoogleSignup(form);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      formElement.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    const result = await signup.run({
      signup_token: pending.data.signup_token,
      farm_name: form.farm_name.trim(),
      phone_number: normalizeKenyanPhone(form.phone_number),
      name: form.name.trim(),
    });

    if (result.ok) {
      await updateSession(result.data);
      navigate(getGateRoute(result.data) ?? safeNextPath(next), { replace: true });
      return;
    }
    if (result.error.code === 'SIGNUP_SESSION_EXPIRED') {
      setPending({ status: 'expired', data: null });
      return;
    }
    setFieldErrors(result.error.fieldErrors);
  };

  if (pending.status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.signupLoading}
      </p>
    );
  }

  if (pending.status !== 'ready') {
    return (
      <div className="space-y-5">
        <AlertBanner type="warning" message={pending.status === 'expired' ? copy.signupExpired : load.error?.message} />
        <GoogleSignInButton next={next} disabled={!online} />
      </div>
    );
  }

  const serverBanner = signup.error && !Object.keys(signup.error.fieldErrors).length ? signup.error.message : '';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight text-ink-900">{copy.signupTitle}</h2>
      <p className="text-sm text-ink-muted">{copy.signupSubtitle(pending.data.email)}</p>

      <TextField
        id="google-signup-name"
        name="name"
        label={fields.yourName}
        autoComplete="name"
        value={form.name}
        onChange={(event) => setField('name', event.target.value)}
        error={fieldErrors.name}
      />
      <TextField
        id="google-signup-farm"
        name="farm_name"
        label={fields.farmName}
        placeholder={fields.farmNamePlaceholder}
        autoComplete="organization"
        value={form.farm_name}
        onChange={(event) => setField('farm_name', event.target.value)}
        error={fieldErrors.farm_name}
      />
      <PhoneField
        id="google-signup-phone"
        name="phone_number"
        value={form.phone_number}
        onValueChange={(value) => setField('phone_number', value)}
        error={fieldErrors.phone_number}
      />

      {serverBanner && <AlertBanner type="danger" title={copy.signupErrorTitle} message={serverBanner} />}

      <SubmitButton pending={signup.pending} pendingLabel={copy.signupSubmitting} retryIn={signup.retryIn} disabled={!online}>
        {copy.signupSubmit}
      </SubmitButton>
    </form>
  );
}
