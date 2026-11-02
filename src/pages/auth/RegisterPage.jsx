import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthDivider from '../../components/auth/AuthDivider';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import PasswordStrength from '../../components/auth/PasswordStrength';
import SubmitButton from '../../components/auth/SubmitButton';
import { PasswordField, PhoneField, TextField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useCountdown } from '../../hooks/useCountdown';
import { getDefaultLandingPath } from '../../lib/roles';
import { getGateRoute } from '../../lib/authState';
import { authApi } from '../../lib/backendApi';
import { rememberLogin } from '../../lib/lastLogin';
import { normalizeKenyanPhone } from '../../lib/phone';
import { validateRegistration } from '../../lib/authValidation';
import { authCopy } from '../../i18n/auth.en';

const { register: copy, fields, common } = authCopy;

// Long enough to read the welcome, short enough not to feel like waiting.
const WELCOME_DELAY_MS = 700;

const FIELD_ORDER = ['full_name', 'farm_name', 'phone_number', 'email', 'password', 'bootstrap_key'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const online = useOnlineStatus();
  const { seconds: retryIn, startFor: waitFor } = useCountdown();

  // Platform owner setup is only reachable through /register?setup=owner, and only while the backend allows it.
  const ownerSetupRequested = searchParams.get('setup') === 'owner';
  const [ownerSetupAvailable, setOwnerSetupAvailable] = useState(false);
  const isOwnerSetup = ownerSetupRequested && ownerSetupAvailable;

  const [formData, setFormData] = useState({
    farm_name: '',
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    bootstrap_key: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordViolations, setPasswordViolations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  useEffect(() => {
    if (!ownerSetupRequested) return undefined;
    let isCurrent = true;

    authApi.bootstrapStatus()
      .then((status) => {
        if (isCurrent) setOwnerSetupAvailable(status?.bootstrap_available === true);
      })
      .catch(() => {
        if (isCurrent) setOwnerSetupAvailable(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [ownerSetupRequested]);

  const setField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((current) => ({ ...current, [name]: undefined }));
    if (name === 'password') setPasswordViolations([]);
  };

  const fieldProps = (name) => ({
    name,
    value: formData[name],
    onChange: (event) => setField(name, event.target.value),
    error: fieldErrors[name],
  });

  const focusFirstInvalid = (form, errors) => {
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) form.elements.namedItem(firstInvalid)?.focus();
    return Boolean(firstInvalid);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setErrorMessage('');

    const errors = validateRegistration(formData, { isOwnerSetup });
    setFieldErrors(errors);
    if (focusFirstInvalid(form, errors)) return;

    const phoneNumber = normalizeKenyanPhone(formData.phone_number);
    const payload = isOwnerSetup
      ? {
          farm_name: formData.full_name.trim(),
          full_name: formData.full_name.trim(),
          phone_number: phoneNumber,
          password: formData.password,
          role: 'SUPER_ADMIN',
          organization_role: 'SUPER_ADMIN',
          tenant_type: 'platform',
          bootstrap_key: formData.bootstrap_key.trim(),
        }
      : {
          farm_name: formData.farm_name.trim(),
          phone_number: phoneNumber,
          password: formData.password,
          ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
        };

    setIsSubmitting(true);
    const result = await register(payload);

    if (result.success) {
      rememberLogin(formData.phone_number);
      setWelcomeName(isOwnerSetup ? formData.full_name.trim() : formData.farm_name.trim());
      const savedUser = sessionStorage.getItem('jivu_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      setTimeout(() => navigate(getGateRoute(user) ?? getDefaultLandingPath(user), { replace: true }), WELCOME_DELAY_MS);
      return;
    }

    const serverFieldErrors = result.details?.fieldErrors ?? {};
    setPasswordViolations(result.details?.passwordViolations ?? []);
    if (result.details?.retryAfter) waitFor(result.details.retryAfter);
    setIsSubmitting(false);

    // A problem with one field is shown next to it; anything else goes in the banner.
    if (Object.keys(serverFieldErrors).length) {
      setFieldErrors(serverFieldErrors);
      focusFirstInvalid(form, serverFieldErrors);
    } else {
      setErrorMessage(result.error);
    }
  };

  const submitLabel = isOwnerSetup ? copy.submitOwner : copy.submit;

  return (
    <AuthLayout
      offline={!online}
      headerAction={<Link to="/login" className="btn-secondary text-sm">{common.logIn}</Link>}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {isOwnerSetup ? copy.ownerTitle : copy.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isOwnerSetup ? copy.ownerSubtitle : copy.subtitle}
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {isOwnerSetup ? (
          <TextField id="register-full-name" label={fields.fullName} autoComplete="name" {...fieldProps('full_name')} />
        ) : (
          <TextField
            id="register-farm-name"
            label={fields.farmName}
            placeholder={fields.farmNamePlaceholder}
            autoComplete="organization"
            {...fieldProps('farm_name')}
          />
        )}

        <PhoneField
          id="register-phone"
          name="phone_number"
          hint={copy.phoneHint}
          value={formData.phone_number}
          onValueChange={(value) => setField('phone_number', value)}
          error={fieldErrors.phone_number}
        />

        {!isOwnerSetup && (
          <TextField
            id="register-email"
            type="email"
            inputMode="email"
            label={fields.emailOptional}
            placeholder={fields.emailPlaceholder}
            hint={fields.emailHint}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            {...fieldProps('email')}
          />
        )}

        <PasswordField
          id="register-password"
          autoComplete="new-password"
          {...fieldProps('password')}
        >
          <PasswordStrength
            password={formData.password}
            personal={{ phone: normalizeKenyanPhone(formData.phone_number), email: formData.email }}
            serverViolations={passwordViolations}
          />
        </PasswordField>

        {isOwnerSetup && (
          <PasswordField
            id="register-setup-code"
            label={copy.setupCode}
            autoComplete="off"
            hint={copy.setupCodeHint}
            {...fieldProps('bootstrap_key')}
          />
        )}

        {errorMessage && (
          <AlertBanner type="danger" title={copy.errorTitle} message={errorMessage} onDismiss={() => setErrorMessage('')} />
        )}

        {welcomeName ? (
          <p role="status" className="btn-command w-full gap-2 py-4 text-base">
            <CheckCircle2 size={18} aria-hidden="true" /> {copy.welcome(welcomeName)}
          </p>
        ) : (
          <SubmitButton pending={isSubmitting} pendingLabel={copy.submitting} retryIn={retryIn} disabled={!online}>
            {submitLabel} <ArrowRight size={18} aria-hidden="true" />
          </SubmitButton>
        )}
      </form>

      {!isOwnerSetup && (
        <>
          <AuthDivider />
          <GoogleSignInButton next="/app" disabled={!online} />
          <p className="mt-6 flex gap-3 rounded-card border border-ink/10 bg-surface p-4 text-sm text-ink-muted">
            <Users size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <span>{copy.inviteNote}</span>
          </p>
        </>
      )}

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-sm text-ink-muted">
        {copy.haveAccount}{' '}
        <Link to="/login" className="font-semibold text-brand underline-offset-4 hover:underline">{common.logIn}</Link>
      </p>
    </AuthLayout>
  );
}
