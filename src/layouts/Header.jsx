import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, UserCircle, Menu } from 'lucide-react';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import Confirmation, { useConfirmation } from '../components/ui/Confirmation';
import offlineQueue from '../lib/offlineQueue';
import { useDataSaver } from '../hooks/useDataSaver';
import LanguageSwitch from '../components/ui/LanguageSwitch';
import { canSwitchLocale } from '../i18n/locale';
import { shellCopy } from '../i18n/shell';
import { roleLabel } from '../lib/staffLabels';
import { pageOwnsHeading } from '../lib/pageHeadings';

const { header: copy } = shellCopy;

/** The user's role in words ("Farm administrator"), never the backend's code. */
const roleName = (role) => {
  const code = String(role ?? '').trim().toUpperCase();
  return copy.roles[code] ?? roleLabel(code);
};

export default function Header({ onMenuClick = () => {} }) {
  const { activeFarm } = useTenant();
  const { currentUser, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const profileRef = useRef(null);
  const signOutConfirmation = useConfirmation();
  const [dataSaver, setDataSaver] = useDataSaver();

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    const pending = (await offlineQueue.getAll().catch(() => [])).length;
    if (pending > 0) {
      const signOutAnyway = await signOutConfirmation.confirm({
        title: copy.pendingTitle,
        message: copy.pendingMessage(pending, navigator.onLine),
        type: 'warning',
        confirmText: copy.signOutAnyway,
        cancelText: copy.staySignedIn,
      });
      if (!signOutAnyway) {
        if (navigator.onLine) offlineQueue.flush().catch(() => {});
        return;
      }
    }
    await logout();
    navigate('/login');
  };

  // TODO(Phase 7): title every page by route, not from the address.
  const pageTitle = pathname === '/dashboard' ? copy.titles.dashboard
    : pathname.startsWith('/operations/yield') ? copy.titles.production
      : pathname.startsWith('/finance/buyers') ? copy.titles.buyers
        : pathname.startsWith('/finance/ledger') ? copy.titles.ledger
          : pathname.startsWith('/operations/milk-usage') ? copy.titles.milkUsage
            : pathname.startsWith('/feed-nutrition/mix') ? shellCopy.nav.items.feedMixes
              : pathname.startsWith('/operations/records') ? shellCopy.nav.items.medical
                : pathname.startsWith('/operations/inventory') ? shellCopy.nav.items.inventory
                  // Same keys as the sidebar labels, so the three titles never differ.
                  : pathname === '/operations/herd' ? shellCopy.nav.items.cowRegister
                    : pathname.startsWith('/operations/breeding') ? shellCopy.nav.items.breeding
                  : pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || copy.farmFallback;

  // The page's one h1 is its own heading where it has one; the top bar's title is then plain text.
  const TitleTag = pageOwnsHeading(pathname) ? 'p' : 'h1';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-ink/10 bg-surface/95 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-6">
      <button type="button" onClick={onMenuClick} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white md:hidden" aria-label={copy.openMenu}><Menu size={20} aria-hidden="true" /></button>
      <TitleTag className="min-w-0 flex-1 truncate font-display text-sm font-semibold capitalize text-ink-900 sm:text-base">{pageTitle}</TitleTag>
      <span className="max-w-[7.5rem] shrink-0 truncate rounded-full border border-brand/20 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-dark sm:max-w-none sm:px-3 sm:text-xs" aria-label={copy.activeWorkspace}>
        {activeFarm?.name || copy.farmFallback}
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
            // On phones the name is hidden; the label keeps it (and says what the button opens).
            aria-label={copy.accountMenu(currentUser?.name || copy.userFallback)}
          >
            {/* On phones this is the only visible content of the account button. */}
            <UserCircle size={20} className="text-brand-400" aria-hidden="true" />
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-bold">{currentUser?.name || copy.userFallback}</span>
              <span className="block text-[10px] font-semibold text-ink-600">{roleName(currentUser?.role) || copy.roleUnknown}</span>
            </span>
            <ChevronDown size={14} className="text-ink-500" aria-hidden="true" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-card border border-ink/10 bg-surface p-2 backdrop-blur" role="menu">
              <div className="border-b border-ink/10 px-3 py-2">
                <p className="truncate text-sm font-bold text-ink-900">{currentUser?.name || copy.userFallback}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{roleName(currentUser?.role) || copy.noRole}</p>
              </div>
              {canSwitchLocale() && (
                <div className="border-b border-ink/10 px-3 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{copy.language}</p>
                  <LanguageSwitch full />
                </div>
              )}
              <label className="flex cursor-pointer items-start justify-between gap-3 border-b border-ink/10 px-3 py-3" htmlFor="data-saver-toggle">
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{copy.dataSaver}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{copy.dataSaverHint}</span>
                </span>
                <input
                  id="data-saver-toggle"
                  type="checkbox"
                  role="switch"
                  checked={dataSaver}
                  onChange={(event) => setDataSaver(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-brand-700"
                />
              </label>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center rounded-button px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-50"
                role="menuitem"
              >
                {copy.signOut}
              </button>
            </div>
          )}
        </div>
      </div>
      <OfflineQueueInspector isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
      <Confirmation {...signOutConfirmation} />
    </header>
  );
}
