import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import AuthLayout from '../../components/auth/AuthLayout';
import SubmitButton from '../../components/auth/SubmitButton';
import WhatsAppCodeCard from '../../components/auth/WhatsAppCodeCard';
import { PhoneField } from '../../components/auth/AuthFields';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePhoneVerification } from '../../hooks/usePhoneVerification';
import { AUTH_STATES, getAuthState, getGateRoute } from '../../lib/authState';
import { getDefaultLandingPath } from '../../lib/roles';
import { displayPhone, normalizeKenyanPhone } from '../../lib/phone';
import { validatePhone } from '../../lib/authValidation';
import { formatClock } from '../../lib/countdown';
import { getAuthErrorMessage } from '../../lib/authErrorMessages';
import { authCopy } from '../../i18n/auth.en';

const { verifyPhone: copy, common } = authCopy;

const ENDED = {
  expired: { title: copy.expiredTitle, message: copy.expired },
  locked: { title: copy.lockedTitle, message: copy.locked },
  cancelled: { title: copy.cancelledTitle, message: copy.cancelled },
};

/**
 * Add and/or verify the account phone through WhatsApp (AUTH_API_CONTRACT §6).
 * Reached through the Google sign-in gate (must finish) or the dashboard
 * banner (can skip).
 */
export default function VerifyPhonePage() {
  const { currentUser, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const verification = usePhoneVerification();
  const { phase, start, reset } = verification;

  const accountPhone = currentUser?.phone_number ?? '';
  const isGated = getAuthState(currentUser) === AUTH_STATES.PHONE_VERIFICATION_REQUIRED;
  const [editing, setEditing] = useState(!accountPhone);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [openedWhatsApp, setOpenedWhatsApp] = useState(false);

  // Ask for a code straight away when the number is already known. The ref
  // keeps StrictMode's double effect from starting (and cancelling) two codes.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || editing || phase !== 'idle' || !online) return;
    autoStarted.current = true;
    start();
  }, [editing, phase, online, start]);

  const submitPhone = async (event) => {
    event.preventDefault();
    const errors = validatePhone(phoneInput);
    setPhoneError(errors.phone_number ?? '');
    if (errors.phone_number) return;
    setOpenedWhatsApp(false);
    if (await start(normalizeKenyanPhone(phoneInput))) setEditing(false);
  };

  const changeNumber = () => {
    reset();
    setOpenedWhatsApp(false);
    setPhoneInput(accountPhone ? displayPhone(accountPhone) : '');
    setEditing(true);
  };

  const getNewCode = () => {
    setOpenedWhatsApp(false);
    start(verification.verification?.phone_number);
  };

  return (
    <AuthLayout offline={!online}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {accountPhone ? copy.title : copy.titleAdd}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{accountPhone ? copy.subtitle : copy.subtitleAdd}</p>
      </header>

      {phase === 'verified' ? (
        <VerifiedStep refreshUser={refreshUser} onContinue={(user) => navigate(getGateRoute(user) ?? getDefaultLandingPath(user), { replace: true })} />
      ) : editing ? (
        <form onSubmit={submitPhone} noValidate className="space-y-5">
          <PhoneField
            id="verify-phone-number"
            name="phone_number"
            value={phoneInput}
            onValueChange={(value) => {
              setPhoneInput(value);
              setPhoneError('');
            }}
            error={phoneError || verification.error?.fieldErrors?.phone_number}
          />
          {phase === 'error' && !verification.error?.fieldErrors?.phone_number && (
            <AlertBanner type="danger" title={copy.errorTitle} message={verification.error.message} />
          )}
          <SubmitButton pending={phase === 'starting'} pendingLabel={copy.starting} retryIn={phase === 'error' ? verification.resendIn : 0} disabled={!online}>
            {copy.submitPhone}
          </SubmitButton>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-card border border-brand/10 bg-brand/5 px-4 py-3">
            <span className="min-w-0 text-sm text-ink-muted">
              {copy.numberLabel}{' '}
              <span className="font-mono font-semibold text-ink-900">{displayPhone(verification.verification?.phone_number ?? accountPhone)}</span>
            </span>
            <button type="button" onClick={changeNumber} className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
              {copy.changeNumber}
            </button>
          </div>

          {(phase === 'idle' || phase === 'starting') && (
            <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" /> {copy.starting}
            </p>
          )}

          {phase === 'pending' && (
            <PendingStep
              verification={verification}
              online={online}
              openedWhatsApp={openedWhatsApp}
              onOpen={() => setOpenedWhatsApp(true)}
              onResend={getNewCode}
            />
          )}

          {ENDED[phase] && (
            <>
              <AlertBanner type="warning" title={ENDED[phase].title} message={ENDED[phase].message} />
              <SubmitButton type="button" onClick={getNewCode} retryIn={verification.resendIn} disabled={!online}>
                <RefreshCw size={18} aria-hidden="true" /> {copy.startAgain}
              </SubmitButton>
            </>
          )}

          {phase === 'error' && (
            <>
              <AlertBanner type="danger" title={copy.errorTitle} message={verification.error.message} />
              <SubmitButton type="button" onClick={getNewCode} retryIn={verification.resendIn} disabled={!online}>
                {common.tryAgain}
              </SubmitButton>
            </>
          )}
        </div>
      )}

      <p className="mt-6 border-t border-ink/10 pt-6 text-center text-sm text-ink-muted">
        {isGated ? (
          <button type="button" onClick={logout} className="font-semibold text-brand underline-offset-4 hover:underline">{copy.signOut}</button>
        ) : (
          <Link to="/app" className="font-semibold text-brand underline-offset-4 hover:underline">{copy.later}</Link>
        )}
      </p>
    </AuthLayout>
  );
}

function PendingStep({ verification, online, openedWhatsApp, onOpen, onResend }) {
  const { verification: challenge, expiresIn, resendIn, checkNow } = verification;

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-900">
        <li>{copy.step1}</li>
        <li>{copy.step2}</li>
      </ol>

      <WhatsAppCodeCard
        waLink={challenge.wa_link}
        messageText={challenge.message_text}
        whatsappNumber={challenge.whatsapp_number}
        buttonLabel={openedWhatsApp ? copy.openAgain : copy.openWhatsApp}
        onOpen={onOpen}
      />

      {online ? (
        <div role="status" className="flex items-start gap-3 rounded-card border border-ink/10 p-4 text-sm">
          <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-brand" aria-hidden="true" />
          <span>
            <span className="block font-semibold text-ink-900">{copy.waiting}</span>
            <span className="block text-ink-muted">{copy.waitingHint}</span>
            {expiresIn > 0 && <span className="mt-1 block text-xs text-ink-muted">{copy.expiresIn(formatClock(expiresIn))}</span>}
          </span>
        </div>
      ) : (
        <AlertBanner type="warning" message={copy.offlinePaused} compact />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {openedWhatsApp && (
          <button type="button" onClick={checkNow} className="btn-secondary flex-1 text-sm font-semibold" disabled={!online}>
            {copy.checkNow}
          </button>
        )}
        <button type="button" onClick={onResend} className="btn-ghost flex-1 text-sm" disabled={resendIn > 0 || !online}>
          {resendIn > 0 ? copy.resendIn(resendIn) : copy.resend}
        </button>
      </div>
    </div>
  );
}

/** Reloads the account so the gate lifts, then lets the farmer continue. */
function VerifiedStep({ refreshUser, onContinue }) {
  const [state, setState] = useState({ status: 'refreshing', user: null, error: '' });
  // refreshUser changes identity whenever the session updates, which it itself causes;
  // reading it through a ref keeps the effect from re-firing in a loop.
  const refreshRef = useRef(refreshUser);
  useEffect(() => {
    refreshRef.current = refreshUser;
  }, [refreshUser]);

  useEffect(() => {
    let current = true;
    if (state.status !== 'refreshing') return undefined;
    refreshRef.current()
      .then((user) => current && setState({ status: 'ready', user, error: '' }))
      .catch((error) => current && setState({ status: 'failed', user: null, error: getAuthErrorMessage(error) }));
    return () => {
      current = false;
    };
  }, [state.status]);

  return (
    <div className="space-y-5">
      <AlertBanner type="success" title={copy.verifiedTitle} message={copy.verified} />
      {state.status === 'failed' && <AlertBanner type="danger" message={state.error} />}
      <SubmitButton
        type="button"
        pending={state.status === 'refreshing'}
        onClick={() => (state.status === 'failed' ? setState({ status: 'refreshing', user: null, error: '' }) : onContinue(state.user))}
      >
        {state.status === 'failed' ? common.tryAgain : <><CheckCircle2 size={18} aria-hidden="true" /> {common.continue}</>}
      </SubmitButton>
    </div>
  );
}
