import { useState } from 'react';
import { useNavigate, Link  } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertBanner from '../../components/ui/AlertBanner';
import { Eye, EyeOff } from 'lucide-react';
import { getDefaultLandingPath } from '../../lib/roles';

const resolveLandingPath = (user) => {
  return getDefaultLandingPath(user);
};


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login({ username, password });

    if (result.success) {
      const savedUser = sessionStorage.getItem('jivu_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      navigate(resolveLandingPath(user), { replace: true });
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden isolate">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #14b8a6 100%)',
          backgroundSize: '100% 100%',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 sm:p-10 relative z-10 transform hover:scale-[1.01] transition-transform">
        <div className="absolute inset-0 pointer-events-none">
          <div className="glass-sheen absolute top-0 left-0 w-1/2 h-full bg-white/6 blur-sm mix-blend-screen opacity-60"></div>
          <div className="glass-noise absolute inset-0 bg-[url('/assets/noise.svg')] opacity-5 mix-blend-overlay"></div>
        </div>
        
        <header className="mb-10 text-center relative z-10 animate-reveal">
          <div className="inline-block bg-brand/10 text-brand px-4 py-1 mb-4 font-sans text-xs font-medium tracking-normal rounded-md border border-brand/20 transition-all hover:bg-brand/15 hover:border-brand/30">
            Secure access
          </div>
          <h1 className="font-display font-semibold text-4xl tracking-tight text-ink-strong">
            Jivu Smart <br /> <span className="text-ink-muted">Dairy System</span>
          </h1>
        </header>

        {error && (
          <div className="mb-6 animate-reveal" style={{animationDelay: '0.1s'}}>
            <AlertBanner type="danger" title="Access Denied" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="animate-stagger" style={{animationDelay: '0.15s'}}>
            <label className="block font-sans font-medium text-xs tracking-normal text-ink-normal mb-2">
              Username
            </label>
            <input
              aria-label="Username"
              type="text"
              className="glass-input w-full rounded-md py-3 px-4 bg-surface/30 border border-white/10 backdrop-blur-md text-ink-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div style={{ animationDelay: '0.25s' }} className="animate-stagger">
            <label className="block font-sans font-medium text-xs tracking-normal text-ink-normal mb-2">
              Password
            </label>
            {/* Added relative positioning wrapper for the toggle */}
            <div className="relative">
              <input
                aria-label="Password"
                type={showPassword ? "text" : "password"}
                // Changed px-4 to pl-4 pr-12 to make room for the eye icon
                className="glass-input w-full rounded-md py-3 pl-4 pr-12 bg-surface/30 border border-white/10 backdrop-blur-md text-ink-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-ghost absolute right-2 top-1/2 h-8 w-8 !min-h-0 -translate-y-1/2 !p-0 text-ink-muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ animationDelay: '0.3s' }} className="animate-stagger">
            <button 
              type="submit" 
              className="btn-command w-full py-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in…' : 'Log in'}
            </button>
          </div>
        </form>
        <div className="mt-8 text-center border-t border-ink/10 pt-6">
          <p className="font-mono text-xs text-ink/60">
            No active workspace detected?{' '}
            <Link to="/register" className="font-bold text-brand hover:text-accent transition-colors underline decoration-2 underline-offset-4">
              Register New Farm
            </Link>
          </p>
        </div>

      </div>
      </div>
    </div>
  );
}
