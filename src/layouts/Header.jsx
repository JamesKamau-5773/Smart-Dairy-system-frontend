import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, LogOut, UserCircle, Menu } from 'lucide-react';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Header({ onMenuClick = () => {} }) {
  const { activeFarm } = useTenant();
  const { currentUser, logout } = useAuth();
  const { pathname } = useLocation();
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

  const pageTitle = pathname === '/dashboard' ? 'Dashboard'
    : pathname.startsWith('/operations/yield') ? 'Production Log'
      : pathname.startsWith('/finance/buyers') ? 'Buyer List'
        : pathname.startsWith('/finance/ledger') ? 'Ledger'
          : pathname.startsWith('/operations/milk-usage') ? 'Milk Usage'
            : pathname.startsWith('/feed-nutrition/mix') ? 'Feed Mixing'
              : pathname.startsWith('/operations/records') ? 'Clinical Registry'
                : pathname.startsWith('/operations/inventory') ? 'Stock Registry'
                  : pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'Farm';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-ink/10 bg-surface/95 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-6">
      <button type="button" onClick={onMenuClick} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white md:hidden" aria-label="Open navigation menu"><Menu size={20} /></button>
      <h1 className="min-w-0 flex-1 truncate font-display text-sm font-semibold capitalize text-ink-900 sm:text-base">{pageTitle}</h1>
      <span className="max-w-[7.5rem] shrink-0 truncate rounded-full border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-dark sm:max-w-none sm:px-3 sm:text-xs" aria-label="Active workspace">
        {activeFarm?.name || 'Farm'}
      </span>
      
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <OfflineIndicator onOpenInspector={() => setSyncOpen(true)} />
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-10 items-center gap-2 rounded-button border border-ink/20 bg-surface px-3 text-left text-ink hover:border-brand-400 hover:bg-brand-50"
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
            <div className="absolute right-0 top-12 w-64 rounded-card border border-ink/10 bg-surface p-2 backdrop-blur" role="menu">
              <div className="border-b border-ink/10 px-3 py-2">
                <p className="truncate text-sm font-bold text-ink-900">{currentUser?.name || 'User'}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{currentUser?.role || 'No role assigned'}</p>
              </div>
              <div className="border-b border-ink/10 px-3 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Interface density</p>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-button px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-50"
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
