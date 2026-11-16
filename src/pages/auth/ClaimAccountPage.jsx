import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultLandingPath } from '../../lib/roles';
import { adminCopy } from '../../i18n/admin';

const copy = adminCopy.claim;

export default function ClaimAccountPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [claimedAccount, setClaimedAccount] = useState(null);

  const { claimAccount } = useAuth();
  const navigate = useNavigate();

  const handleClaim = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!token) {
      setMessage({ type: 'danger', text: copy.missingToken });
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
      setMessage({ type: 'danger', text: copy.badUsername });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'danger', text: copy.shortPassword });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: copy.mismatch });
      return;
    }

    setIsSubmitting(true);

    const result = await claimAccount({ token, username: normalizedUsername, password });

    if (result.success) {
      setClaimedAccount({
        username: result.user?.username || normalizedUsername,
        phoneNumber: result.user?.phone_number || '',
        user: result.user,
      });
      return;
    }

    setMessage({ type: 'danger', text: result.error || copy.failed });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffe7d4_0%,#f6f4ff_42%,#e6f9f0_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[85vh] max-w-xl items-center">
        <section className="w-full rounded-2xl border border-[#5a3b8d]/20 bg-white/90 p-8 ">
          <header className="mb-7 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#5a3b8d]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4d3276]">
              <ShieldCheck size={14} /> {copy.badge}
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#372257]">{copy.title}</h1>
            <p className="mt-2 text-sm text-[#563f79]">{copy.subtitle}</p>
          </header>

          {message.text && (
            <div className="mb-4">
              <AlertBanner type={message.type || 'info'} title={copy.statusTitle} message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
            </div>
          )}

          {claimedAccount ? (
            <div className="space-y-5">
              <AlertBanner type="success" title={copy.activatedTitle} message={copy.activatedText} />
              <div className="rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] p-4 text-sm text-[#2f1d4d]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5f4a82]">{copy.username}</p>
                <p className="mt-1 select-all font-mono text-lg font-bold">{claimedAccount.username}</p>
                {claimedAccount.phoneNumber && <p className="mt-2 text-xs text-[#563f79]">{copy.registeredPhone(claimedAccount.phoneNumber)}</p>}
              </div>
              <button type="button" className="btn-command w-full" onClick={() => navigate(getDefaultLandingPath(claimedAccount.user), { replace: true })}>
                {copy.continue}
              </button>
            </div>
          ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              {copy.inviteToken}
              <input
                className="mt-2 w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] px-4 py-3 text-sm text-[#2f1d4d] outline-none"
                value={token}
                readOnly
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              {copy.chooseUsername}
              <input
                className="mt-2 w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] px-4 py-3 text-sm text-[#2f1d4d] outline-none focus:border-[#5a3b8d] focus:ring-2 focus:ring-[#5a3b8d]/20"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9._-]{3,32}"
                autoComplete="username"
                required
                title={copy.usernameRule}
              />
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-[#6b5b86]">{copy.usernameHint}</span>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              {copy.newPassword}
              <div className="relative mt-2">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5b86]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] py-3 pl-10 pr-12 text-sm text-[#2f1d4d] outline-none focus:border-[#5a3b8d] focus:ring-2 focus:ring-[#5a3b8d]/20"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[#6b5b86] hover:bg-[#5a3b8d]/10 focus:outline-none focus:ring-2 focus:ring-[#5a3b8d]/30"
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              {copy.confirmPassword}
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] py-3 pl-4 pr-12 text-sm text-[#2f1d4d] outline-none focus:border-[#5a3b8d] focus:ring-2 focus:ring-[#5a3b8d]/20"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[#6b5b86] hover:bg-[#5a3b8d]/10 focus:outline-none focus:ring-2 focus:ring-[#5a3b8d]/30"
                  aria-label={showConfirmPassword ? copy.hideConfirm : copy.showConfirm}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button type="submit" className="btn-command w-full" disabled={isSubmitting}>
              {isSubmitting ? copy.claiming : copy.submit}
            </button>
          </form>
          )}
        </section>
      </div>
    </div>
  );
}
