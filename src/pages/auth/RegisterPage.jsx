import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Building, ArrowRight } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';

export default function RegisterPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    farmName: '',
    fullName: '',
    phone: '',
    password: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would connect to your Flask backend: apiClient.post('/auth/register', formData)
    console.log("Registering Node:", formData);
    
    // Simulate successful registration and redirect to login
    setSuccessMessage('Registration complete. Log in to get started.');
    navigate('/login');
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
          <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
            <AlertBanner type="success" title="Registered" message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
          </div>
        )}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand/5 text-brand border border-brand/10 px-4 py-1 mb-4 font-mono text-xs font-black tracking-widest rounded-full">
            <Building size={12} /> NEW WORKSPACE
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tighter text-brand uppercase">
            Register <span className="text-ink/40">Farm</span>
          </h1>
          <p className="font-mono text-xs text-ink-muted mt-2">Create your secure management workspace.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Farm Name */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Farm Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Building size={16} /></div>
                <input 
                  type="text" 
                  placeholder="e.g. Bahati Dairies"
                  className="input-machined pl-10"
                  value={formData.farmName}
                  onChange={(e) => setFormData({...formData, farmName: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Owner Name */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><User size={16} /></div>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  className="input-machined pl-10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
              Phone Number 
            </label>
            <input 
              type="tel" 
              placeholder="e.g. 0712 345 678"
              className="input-machined font-mono"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
            />
          </div>

          {/* Password Input with Toggle */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Lock size={16} /></div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••••••"
                className="input-machined pl-10 pr-12 font-mono tracking-widest"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/40 hover:text-brand transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <button type="submit" className="btn-command w-full py-4 text-lg mt-6 flex justify-center items-center gap-2">
            Set Up Farm Account <ArrowRight size={18} />
          </button>
        </form>

        {/* Navigation back to login */}
        <div className="mt-8 text-center border-t border-ink/10 pt-6">
          <p className="font-mono text-xs text-ink/60">
            Already have an active workspace?{' '}
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