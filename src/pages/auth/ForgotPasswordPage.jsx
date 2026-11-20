import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import SubmitButton from '../../components/auth/SubmitButton';
import WhatsAppCodeCard from '../../components/auth/WhatsAppCodeCard';
import { PhoneField, TextField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useCountdown } from '../../hooks/useCountdown';
import { authApi } from '../../lib/backendApi';
import { classifyIdentifier } from '../../lib/identifier';
import { getLastLogin } from '../../lib/lastLogin';
import { formatKenyanPhoneInput, normalizeKenyanPhone } from '../../lib/phone';
import { validateEmail, validatePhone } from '../../lib/authValidation';
import { formatClock } from '../../lib/countdown';
import { authCopy } from '../../i18n/auth';

const { forgot: copy, fields, common } = authCopy;

// WhatsApp works for every account with a phone, so it is offered while options load
// (or if they fail to load on a weak connection). Email only appears once the server enables it.
const FALLBACK_CHANNELS = [{ id: 'whatsapp', enabled: true }];
const RESEND_COOLDOWN_SECONDS = 60;

// Prefill from the last login on this device, shown the way the farmer typed it.
function initialIdentifiers() {
  const lastLogin = getLastLogin();
  const remembered = classifyIdentifier(lastLogin);
  return {
    phone_number: remembered.type === 'phone' ? formatKenyanPhoneInput(lastLogin) : '',
    email: remembered.type === 'email' ? remembered.value : '',
  };
}

export default function ForgotPasswordPage() {
  const online = useOnlineStatus();
  const [options, setOptions] = useState({ channels: FALLBACK_CHANNELS, adminHint: copy.adminHint });
  const [channel, setChannel] = useState('whatsapp');
  const [values, setValues] = useState(initialIdentifiers);
  const [fieldError, setFieldError] = useState('');
  const [sent, setSent] = useState(null);
  const send = useAsyncAction(authApi.requestPasswordReset, 'forgotPassword');
  const { seconds: resendIn, startFor: startResendCooldown } = useCountdown();
  const { seconds: expiresIn, startFor: startExpiry } = useCountdown();

  useEffect(() => {
    let current = true;
    authApi.forgotPasswordOptions()
      .then((data) => {
        if (!current) return;
        const enabled = (data?.channels ?? []).filter((option) => option.enabled);
        setOptions({ channels: enabled, adminHint: data?.admin_reset_hint || copy.adminHint });
        if (enabled.length && !enabled.some((option) => option.id === 'whatsapp')) setChannel(enabled[0].id);
      })
      .catch(() => {
        // Keep offering WhatsApp; the request itself reports CHANNEL_DISABLED if needed.
      });
    return () => {
      current = false;
    };
  }, []);

  const field = channel === 'email' ? 'email' : 'phone_number';

  const submit = async (event) => {
    event?.preventDefault();
    const errors = channel === 'email' ? validateEmail(values.email) : validatePhone(values.phone_number);
    setFieldError(errors[field] ?? '');
    if (errors[field]) {
      document.getElementById(`forgot-${field}`)?.focus();
      return;
    }

    const result = await send.run({
      channel,
      phone_number: normalizeKenyanPhone(values.phone_number),
      email: values.email.trim().toLowerCase(),
    });
    if (!result.ok) {
      if (result.error.fieldErrors[field]) setFieldError(result.error.fieldErrors[field]);
      return;
    }
    setSent(result.data);
    startResendCooldown(RESEND_COOLDOWN_SECONDS);
    startExpiry(result.data?.expires_in_seconds ?? 600);
  };

  const startOver = () => {
    setSent(null);
    send.clearError();
  };

  const hasChannels = options.channels.length > 0;

  return (
    <AuthLayout offline={!online}>
      <header className="mb-6">
        <h1 className="text-page-title text-ink-900">{sent ? copy.sentTitle : copy.title}</h1>
        {!sent && <p className="mt-2 text-body text-ink-muted">{copy.subtitle}</p>}
      </header>

      {sent ? (
        <SentStep
          sent={sent}
          expiresIn={expiresIn}
          resendIn={resendIn}
          pending={send.pending}
          error={send.error?.message}
          online={online}
          onResend={() => submit()}
          onStartOver={startOver}
        />
      ) : !hasChannels ? (
        <AlertBanner type="warning" message={copy.noChannels} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {options.channels.length > 1 && (
            <fieldset>
              <legend className="mb-2 block text-field-label text-ink-muted">{copy.channelLabel}</legend>
              <div className="grid grid-cols-2 gap-2">
                {options.channels.map((option) => {
                  const selected = channel === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex min-h-12 cursor-pointer items-center justify-center rounded-card border px-3 text-field-label ${selected ? 'border-brand bg-brand/5 text-brand' : 'border-ink/15 text-ink-900'}`}
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={option.id}
                        checked={selected}
                        onChange={() => {
                          setChannel(option.id);
                          setFieldError('');
                          send.clearError();
                        }}
                        className="sr-only"
                      />
                      {copy[option.id] ?? option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {channel === 'email' ? (
            <TextField
              id="forgot-email"
              name="email"
              type="email"
              inputMode="email"
              label={fields.email}
              placeholder={fields.emailPlaceholder}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={values.email}
              onChange={(event) => {
                setValues((current) => ({ ...current, email: event.target.value }));
                setFieldError('');
              }}
              error={fieldError}
            />
          ) : (
            <PhoneField
              id="forgot-phone_number"
              name="phone_number"
              value={values.phone_number}
              onValueChange={(value) => {
                setValues((current) => ({ ...current, phone_number: value }));
                setFieldError('');
              }}
              error={fieldError}
            />
          )}

          {send.error && !fieldError && <AlertBanner type="danger" title={copy.errorTitle} message={send.error.message} />}

          <SubmitButton pending={send.pending} pendingLabel={copy.submitting} retryIn={send.retryIn} disabled={!online}>
            {copy.submit}
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 text-meta text-ink-muted">{options.adminHint}</p>

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-body text-ink-muted">
        {copy.remembered}{' '}
        <Link to="/login" className="text-body-strong text-brand underline-offset-4 hover:underline">{common.logIn}</Link>
      </p>
    </AuthLayout>
  );
}

/**
 * The response never says whether an account exists (contract §7), so this
 * screen reads the same for everyone. WhatsApp has no status to poll: the
 * reset link arrives as a WhatsApp reply.
 */
function SentStep({ sent, expiresIn, resendIn, pending, error, online, onResend, onStartOver }) {
  const isWhatsApp = sent.channel === 'whatsapp' && sent.wa_link;

  return (
    <div className="space-y-5">
      <AlertBanner type="success" message={isWhatsApp ? copy.neutral : copy.emailSent} />

      {isWhatsApp && (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-body text-ink-900">
            <li>{copy.whatsappStep1}</li>
            <li>{copy.whatsappStep2}</li>
            <li>{copy.whatsappStep3}</li>
          </ol>
          <WhatsAppCodeCard
            waLink={sent.wa_link}
            messageText={sent.message_text}
            whatsappNumber={sent.whatsapp_number}
            buttonLabel={copy.openWhatsApp}
          />
          {expiresIn > 0 && <p className="text-meta text-ink-muted">{copy.expiresIn(formatClock(expiresIn))}</p>}
        </>
      )}

      {error && <AlertBanner type="danger" message={error} />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onResend} className="btn-secondary flex-1 text-control" disabled={pending || resendIn > 0 || !online}>
          {resendIn > 0 ? common.waitSeconds(resendIn) : copy.sendAgain}
        </button>
        <button type="button" onClick={onStartOver} className="btn-ghost flex-1 text-control">
          {copy.useOther}
        </button>
      </div>
    </div>
  );
}
