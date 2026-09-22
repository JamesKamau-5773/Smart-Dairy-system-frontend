import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Header() {
  const { activeFarm } = useTenant();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <span className="ml-12 truncate font-display text-sm font-semibold text-ink-900 md:ml-0">
        {activeFarm?.name || 'Initializing'}
      </span>
      
      <div className="ml-auto flex items-center gap-3">
        <OfflineIndicator onOpenInspector={() => setSyncOpen(true)} />
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-10 items-center gap-2 rounded-button border border-slate-300 bg-white px-3 text-left text-ink-900 hover:border-brand-400 hover:bg-brand-50"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <UserCircle size={20} className="text-brand-400" />
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-bold">{currentUser?.name || 'User'}</span>
              <span className="block text-[10px] font-semibold uppercase text-ink-600">{currentUser?.role || 'N/A'}</span>
            </span>
            <ChevronDown size={14} className="text-ink-500" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-card border border-slate-200 bg-white/95 p-2 backdrop-blur" role="menu">
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="truncate text-sm font-bold text-ink-900">{currentUser?.name || 'User'}</p>
                <p className="mt-0.5 text-xs text-slate-600">{currentUser?.role || 'No role assigned'}</p>
              </div>
              <div className="border-b border-slate-200 px-3 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Interface density</p>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-button px-3 py-2 text-sm font-semibold text-danger-900 hover:bg-danger-50"
                role="menuitem"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      <OfflineQueueInspector isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
    </header>
  );
}