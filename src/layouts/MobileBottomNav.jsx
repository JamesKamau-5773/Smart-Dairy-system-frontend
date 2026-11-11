import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Users, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultLandingPath } from '../lib/roles';
import { canSeeBuyers, canSeeLedger, canSeeProductionLog } from '../lib/navAccess';
import { shellCopy } from '../i18n/shell';

const { bottomNav: copy } = shellCopy;

const tabs = [
  { id: 'dashboard', to: null, icon: LayoutDashboard, visible: () => true },
  // Same checks as the sidebar (lib/navAccess), so a tab never leads to a locked page.
  { id: 'production', to: '/operations/yield', icon: BookOpen, visible: canSeeProductionLog },
  { id: 'buyers', to: '/finance/buyers', icon: Users, visible: canSeeBuyers },
  { id: 'ledger', to: '/finance/ledger', icon: Wallet, visible: canSeeLedger },
];

export default function MobileBottomNav() {
  const { currentUser } = useAuth();
  const landingPath = getDefaultLandingPath(currentUser);
  const items = tabs
    .filter((tab) => tab.visible(currentUser))
    .map((tab) => ({ ...tab, label: copy[tab.id], to: tab.to ?? landingPath }));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label={copy.label}
    >
      <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ id, label, to, icon: Icon }) => (
          <NavLink
            key={id}
            to={to}
            className={({ isActive }) => `flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 py-2 text-center transition-colors ${
              isActive
                ? 'border-brand-400 bg-brand-50 text-brand-900'
                : 'border-transparent text-ink-muted hover:bg-brand-50 hover:text-brand-900'
            }`}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="max-w-full truncate text-[10px] font-semibold leading-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
