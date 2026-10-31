import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import { PasswordField, TextField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getDefaultLandingPath } from '../../lib/roles';
import { authApi } from '../../lib/backendApi';
import { rememberLogin } from '../../lib/lastLogin';
import { formatKenyanPhoneInput, normalizeKenyanPhone } from '../../lib/staffAccessForm';

const MIN_PASSWORD_LENGTH = 8;
// Long enough to read the welcome, short enough not to feel like waiting.
const WELCOME_DELAY_MS = 700;

const FIELD_ORDER = ['full_name', 'farm_name', 'phone_number', 'password', 'bootstrap_key'];

function validate(formData, isOwnerSetup) {
  const errors = {};
  if (isOwnerSetup && !formData.full_name.trim()) errors.full_name = 'Enter your full name.';
  if (!isOwnerSetup && !formData.farm_name.trim()) errors.farm_name = 'Enter your farm’s name.';
  if (!normalizeKenyanPhone(formData.phone_number)) errors.phone_number = 'Enter a Kenyan mobile number, for example 0712 345 678.';
  if (formData.password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (isOwnerSetup && !formData.bootstrap_key.trim()) errors.bootstrap_key = 'Enter the owner setup code from your platform administrator.';
  return errors;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const online = useOnlineStatus();

  // Platform owner setup is only reachable through /register?setup=owner, and only while the backend allows it.
  const ownerSetupRequested = searchParams.get('setup') === 'owner';
  const [ownerSetupAvailable, setOwnerSetupAvailable] = useState(false);
  const isOwnerSetup = ownerSetupRequested && ownerSetupAvailable;

  const [formData, setFormData] = useState({
    farm_name: '',
    full_name: '',
    phone_number: '',
    password: '',
    bootstrap_key: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
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

  const updateField = (name) => (event) => {
    const value = name === 'phone_number' ? formatKenyanPhoneInput(event.target.value) : event.target.value;
    setFormData((current) => ({ ...current, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const fieldProps = (name) => ({
    name,
    value: formData[name],
    onChange: updateField(name),
    error: fieldErrors[name],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const errors = validate(formData, isOwnerSetup);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      e.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }

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
        };

    setIsSubmitting(true);
    const result = await register(payload);

    if (result.success) {
      rememberLogin(formData.phone_number);
      setWelcomeName(isOwnerSetup ? formData.full_name.trim() : formData.farm_name.trim());
      const savedUser = sessionStorage.getItem('jivu_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      setTimeout(() => navigate(getDefaultLandingPath(user), { replace: true }), WELCOME_DELAY_MS);
      return;
    }

    setErrorMessage(result.error);
    setIsSubmitting(false);
  };

  const submitLabel = isOwnerSetup ? 'Create owner account' : 'Create farm account';

  return (
    <AuthLayout
      offline={!online}
      headerAction={<Link to="/login" className="btn-secondary text-sm">Log in</Link>}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {isOwnerSetup ? 'Set up the platform owner' : 'Create your farm account'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isOwnerSetup
            ? 'For trusted platform owners only. Your setup code is checked before the account is created.'
            : 'Three quick details and you can record your first milking today.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {isOwnerSetup ? (
          <TextField id="register-full-name" label="Full name" autoComplete="name" {...fieldProps('full_name')} />
        ) : (
          <TextField
            id="register-farm-name"
            label="Farm name"
            placeholder="e.g. Bahati Dairies"
            autoComplete="organization"
            {...fieldProps('farm_name')}
          />
        )}

        <TextField
          id="register-phone"
          type="tel"
          inputMode="tel"
          label="Phone number"
          placeholder="e.g. 0712 345 678"
          autoComplete="tel"
          hint="You’ll use this number to log in."
          className="font-mono"
          {...fieldProps('phone_number')}
        />

        <PasswordField
          id="register-password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          {...fieldProps('password')}
        />

        {isOwnerSetup && (
          <PasswordField
            id="register-setup-code"
            label="Owner setup code"
            autoComplete="off"
            hint="Provided by your platform administrator."
            {...fieldProps('bootstrap_key')}
          />
        )}

        {errorMessage && (
          <AlertBanner type="danger" title="Couldn’t create your account" message={errorMessage} onDismiss={() => setErrorMessage('')} />
        )}

        <button type="submit" className="btn-command w-full gap-2 py-4 text-base" disabled={isSubmitting || !online}>
          {welcomeName ? (
            <span role="status" className="flex items-center gap-2"><CheckCircle2 size={18} aria-hidden="true" /> Karibu, {welcomeName}!</span>
          ) : isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Creating your account…</>
          ) : (
            <>{submitLabel} <ArrowRight size={18} aria-hidden="true" /></>
          )}
        </button>
      </form>

      {!isOwnerSetup && (
        <p className="mt-6 flex gap-3 rounded-card border border-ink/10 bg-surface p-4 text-sm text-ink-muted">
          <Users size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <span>Joining a cooperative or a farm team? Open the invite link you were sent instead. It sets up your account for you.</span>
        </p>
      )}

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand underline-offset-4 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
