import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultLandingPath } from '../../lib/roles';

export default function ClaimAccountPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { claimAccount } = useAuth();
  const navigate = useNavigate();

  const handleClaim = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!token) {
      setMessage({ type: 'danger', text: 'Missing invite token. Use a valid claim link.' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'danger', text: 'Password must be at least 8 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: 'Password confirmation does not match.' });
      return;
    }

    setIsSubmitting(true);

    const result = await claimAccount({ token, password });

    if (result.success) {
      const savedUser = sessionStorage.getItem('jivu_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      navigate(getDefaultLandingPath(user), { replace: true });
      return;
    }

    setMessage({ type: 'danger', text: result.error || 'Unable to claim account.' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffe7d4_0%,#f6f4ff_42%,#e6f9f0_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[85vh] max-w-xl items-center">
        <section className="w-full rounded-2xl border border-[#5a3b8d]/20 bg-white/90 p-8 shadow-[0_18px_50px_rgba(90,59,141,0.14)]">
          <header className="mb-7 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#5a3b8d]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4d3276]">
              <ShieldCheck size={14} /> Secure Claim
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#372257]">Claim Your Account</h1>
            <p className="mt-2 text-sm text-[#563f79]">Set your new password to activate access from this invite token.</p>
          </header>

          {message.text && (
            <div className="mb-4">
              <AlertBanner type={message.type || 'info'} title="Claim status" message={message.text} onDismiss={() => setMessage({ type: '', text: '' })} />
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              Invite Token
              <input
                className="mt-2 w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] px-4 py-3 text-sm text-[#2f1d4d] outline-none"
                value={token}
                readOnly
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              New Password
              <div className="relative mt-2">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5b86]" />
                <input
                  type="password"
                  className="w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] py-3 pl-10 pr-4 text-sm text-[#2f1d4d] outline-none focus:border-[#5a3b8d] focus:ring-2 focus:ring-[#5a3b8d]/20"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f4a82]">
              Confirm Password
              <input
                type="password"
                className="mt-2 w-full rounded-lg border border-[#5a3b8d]/20 bg-[#faf7ff] px-4 py-3 text-sm text-[#2f1d4d] outline-none focus:border-[#5a3b8d] focus:ring-2 focus:ring-[#5a3b8d]/20"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn-command w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Claiming account…' : 'Claim account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
