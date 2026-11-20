import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
            <h1 className="text-page-title text-[#372257]">{copy.title}</h1>
            <p className="mt-2 text-body text-[#563f79]">{copy.subtitle}</p>
          </header>

          {message.text && (
            <div className="mb-4">
              <AlertBanner type={message.type || 'info'} title={copy.statusTitle} message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
            </div>
          )}

          {claimedAccount ? (
            <div className="space-y-5">
              <AlertBanner type="success" title={copy.activatedTitle} message={copy.activatedText} />
              <div className="rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] p-4 text-body text-[#2f1d4d]">
                <p className="text-label text-[#5f4a82]">{copy.username}</p>
                <p className="mt-1 select-all text-body-strong tabular-nums">{claimedAccount.username}</p>
                {claimedAccount.phoneNumber && <p className="mt-2 text-meta text-[#563f79]">{copy.registeredPhone(claimedAccount.phoneNumber)}</p>}
              </div>
              <button type="button" className="btn-command w-full" onClick={() => navigate(getDefaultLandingPath(claimedAccount.user), { replace: true })}>
                {copy.continue}
              </button>
            </div>
          ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <label className="block text-field-label text-ink-muted">
              {copy.inviteToken}
              <input
                className="input-machined w-full text-control mt-2"
                value={token}
                readOnly
              />
            </label>

            <label className="block text-field-label text-ink-muted">
              {copy.chooseUsername}
              <input
                className="input-machined w-full text-control mt-2"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9._-]{3,32}"
                autoComplete="username"
                required
                title={copy.usernameRule}
              />
              <span className="mt-1 block text-meta normal-case text-[#6b5b86]">{copy.usernameHint}</span>
            </label>

            <label className="block text-field-label text-ink-muted">
              {copy.newPassword}
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-machined w-full text-control pr-12"
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
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </label>

            <label className="block text-field-label text-ink-muted">
              {copy.confirmPassword}
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-machined w-full text-control pr-12"
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
                  {showConfirmPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
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
