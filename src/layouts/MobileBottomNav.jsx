import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Users, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultLandingPath } from '../lib/roles';
import { canSeeBuyers, canSeeLedger, canSeeProductionLog } from '../lib/navAccess';
import { shellCopy } from '../i18n/shell';
import { activeTabId, BOTTOM_TABS, navRoute } from '../lib/navRoutes';

const { bottomNav: copy } = shellCopy;

// The tabs, in order, with the sidebar destination each stands for: lib/navRoutes (BOTTOM_TABS).
// Here: each tab's icon and who sees it. Same checks as the sidebar (lib/navAccess), so a tab
// never leads to a locked page.
const TAB_ICONS = { dashboard: LayoutDashboard, production: BookOpen, buyers: Users, ledger: Wallet };
const TAB_VISIBLE = { dashboard: () => true, production: canSeeProductionLog, buyers: canSeeBuyers, ledger: canSeeLedger };

export default function MobileBottomNav() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const landingPath = getDefaultLandingPath(currentUser);
  const activeId = activeTabId(location, landingPath);
  const items = BOTTOM_TABS
    .filter((tab) => TAB_VISIBLE[tab.id](currentUser))
    .map((tab) => ({
      ...tab,
      icon: TAB_ICONS[tab.id],
      label: copy[tab.id],
      to: tab.id === 'dashboard' ? landingPath : navRoute(tab.navId).to,
    }));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label={copy.label}
    >
      <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ id, label, to, icon: Icon }) => (
          <Link
            key={id}
            to={to}
            aria-current={id === activeId ? 'page' : undefined}
            className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 py-2 text-center transition-colors ${
              id === activeId
                ? 'border-brand-400 bg-brand-50 text-brand-900'
                : 'border-transparent text-ink-muted hover:bg-brand-50 hover:text-brand-900'
            }`}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="max-w-full truncate text-[10px] font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
