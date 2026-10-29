import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Building, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import { getDefaultLandingPath, isSuperAdmin } from '../../lib/roles';
import { authApi } from '../../lib/backendApi';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { currentUser, register } = useAuth();
  const [superAdminBootstrapEnabled, setSuperAdminBootstrapEnabled] = useState(false);
  const [registrationMode, setRegistrationMode] = useState('single');

  const [formData, setFormData] = useState({
    farm_name: '',
    cooperative_name: '',
    full_name: '',
    phone_number: '',
    password: '',
    bootstrap_key: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    authApi.bootstrapStatus()
      .then((status) => {
        if (isCurrent) {
          setSuperAdminBootstrapEnabled(status?.bootstrap_available === true);
        }
      })
      .catch(() => {
        if (isCurrent) setSuperAdminBootstrapEnabled(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const isSuperAdminBootstrap = registrationMode === 'super_admin';

    const payload = isSuperAdminBootstrap
      ? {
          farm_name: formData.full_name.trim() || 'Platform Admin',
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          password: formData.password,
          role: 'SUPER_ADMIN',
          organization_role: 'SUPER_ADMIN',
          tenant_type: 'platform',
          bootstrap_key: formData.bootstrap_key.trim(),
        }
      : {
          farm_name: formData.farm_name.trim(),
          phone_number: formData.phone_number.trim(),
          password: formData.password,
        };

    if (payload.password.length < 8) {
      setErrorMessage('In the Password field, enter at least 8 characters.');
      return;
    }

    if (isSuperAdminBootstrap) {
      if (!payload.full_name) {
        setErrorMessage('Enter your full name in the Full Name field above.');
        return;
      }
      if (!payload.phone_number) {
        setErrorMessage('Enter your phone number in the Phone Number field above.');
        return;
      }
      if (!payload.bootstrap_key) {
        setErrorMessage('Enter the owner setup code in the Owner Setup Code field. It is provided by your platform administrator.');
        return;
      }
    } else if (!payload.farm_name || !payload.phone_number) {
      setErrorMessage(!payload.farm_name
        ? 'Enter your farm name in the Farm Name field above.'
        : 'Enter your phone number in the Phone Number field above.');
      return;
    }

    setIsSubmitting(true);

    const result = await register(payload);

    if (result.success) {
      setSuccessMessage('Account created! Taking you to your dashboard...');
      const savedUser = sessionStorage.getItem('jivu_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      navigate(getDefaultLandingPath(user), { replace: true });
      return;
    }

    setErrorMessage(result.error);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden isolate p-4">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #14b8a6 100%)',
          backgroundSize: '100% 100%',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="card-machined w-full max-w-lg p-10 relative z-10 animate-reveal">
          {successMessage && (
            <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
              <AlertBanner type="success" title="Registered" message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
            </div>
          )}

          {errorMessage && (
            <div className="fixed top-4 right-4 z-[60] w-[min(92vw,430px)]">
              <AlertBanner type="danger" title="Couldn’t create account" message={errorMessage} onDismiss={() => setErrorMessage('')} />
            </div>
          )}

          <header className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-brand/5 text-brand border border-brand/10 px-4 py-1 mb-4 font-mono text-xs font-black tracking-widest rounded-full">
              <Building size={12} /> FARM REGISTRATION
            </div>
            <h1 className="font-sans font-black text-3xl tracking-tighter text-brand uppercase">
              Register <span className="text-ink/40">Farm</span>
            </h1>
            <p className="font-mono text-xs text-ink-muted mt-2">Built for everyone. Start your own farm instantly, or join your cooperative through a secure invite link.</p>
          </header>

          <div className="mb-6 space-y-2 rounded-xl border border-ink/10 bg-surface/40 p-4">
            <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
              Farm Type
            </label>
            <select
              value={registrationMode}
              onChange={(event) => setRegistrationMode(event.target.value)}
              className="input-machined w-full"
            >
              <option value="single">Own Farm</option>
              <option value="cooperative">Cooperative</option>
              {superAdminBootstrapEnabled && <option value="super_admin">Super Admin Bootstrap</option>}
            </select>
          </div>

          {registrationMode === 'cooperative' ? (
            <div className="space-y-4 rounded-xl border border-brand/20 bg-white/80 p-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand">
                <ShieldCheck size={12} /> Invite-First Security
              </p>
              <h2 className="text-xl font-black tracking-tight text-ink-strong">Super Admin Cooperative Setup</h2>
              <p className="text-sm text-ink-muted">
                Cooperatives are registered by super admins. After creation, the first cooperative admin is invited, then farm admins invite staff via claim links.
              </p>

              {isSuperAdmin(currentUser) ? (
                <button
                  type="button"
                  onClick={() => navigate('/system-admin/cooperatives')}
                  className="btn-command w-full flex items-center justify-center gap-2"
                >
                  <Users size={16} /> Open Cooperative Registration
                </button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Sign in as a super admin to register a cooperative. Farm and member users are onboarded through invite and claim flows.
                </div>
              )}
            </div>
          ) : registrationMode === 'super_admin' && superAdminBootstrapEnabled ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Super admin bootstrap should be used only for trusted platform owners. The backend should validate the bootstrap key before accepting this role.
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Owner"
                  className="input-machined"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  className="input-machined font-mono"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Lock size={16} /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    placeholder="••••••••••••"
                    className="input-machined pl-10 pr-12 font-mono tracking-widest"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-ghost absolute right-2 top-1/2 h-8 w-8 !min-h-0 -translate-y-1/2 !p-0 text-ink/40"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">Use at least 8 characters.</p>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Owner Setup Code
                </label>
                <input
                  aria-label="Owner setup code"
                  autoComplete="off"
                  type="password"
                  placeholder="Provided by your platform administrator"
                  className="input-machined font-mono tracking-widest"
                  value={formData.bootstrap_key}
                  onChange={(e) => setFormData({ ...formData, bootstrap_key: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-command w-full py-4 text-lg mt-6 flex justify-center items-center gap-2" disabled={isSubmitting}>
                {isSubmitting ? 'Creating super admin…' : <>Create Super Admin <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                    Farm Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Building size={16} /></div>
                    <input
                      type="text"
                      placeholder="e.g. Bahati Dairies"
                      className="input-machined pl-10"
                      value={formData.farm_name}
                      onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  className="input-machined font-mono"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Lock size={16} /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    placeholder="••••••••••••"
                    className="input-machined pl-10 pr-12 font-mono tracking-widest"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-ghost absolute right-2 top-1/2 h-8 w-8 !min-h-0 -translate-y-1/2 !p-0 text-ink/40"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">Use at least 8 characters.</p>
              </div>

              <button type="submit" className="btn-command w-full py-4 text-lg mt-6 flex justify-center items-center gap-2" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : <>Set Up Farm Account <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-ink/10 pt-6">
            <p className="font-mono text-xs text-ink/60">
              Already have an active farm account?{' '}
              <Link to="/login" className="font-bold text-brand hover:text-accent transition-colors underline decoration-2 underline-offset-4">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
