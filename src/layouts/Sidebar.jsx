import React, { useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { Link, useLocation } from 'react-router-dom';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FarmSwitcher from './FarmSwitcher';
import { canSeeBuyers, canSeeLedger, canSeeProductionLog, UNIT_HELPER_ROLES } from '../lib/navAccess';
import { canAccessCommandCenter, canViewAdminControls, isCooperativeAdmin, isSuperAdmin, hasRole, hasPageAccess } from '../lib/roles';
import { navItemHref } from '../lib/navigation';
import { activeNavRoute, NAV_GROUPS, NAV_ROUTES } from '../lib/navRoutes';
import { shellCopy } from '../i18n/shell';
import { SITE } from '../landing/content';

const { nav: copy } = shellCopy;

const PHONE_FOLDED_GROUPS = new Set(['herd', 'feeding', 'finance', 'reports', 'compliance', 'hr']);

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const showAdminControls = canViewAdminControls(currentUser);
  const canViewBreeding = true;
  const canViewStaffRegistry = showAdminControls || hasRole(currentUser, ['FARMER']);
  const canViewPayroll = showAdminControls;
  const canViewHerdsmanView = true;
  const canViewFeedNutrition = showAdminControls || Boolean(currentUser);
  const isPlatformAdmin = isSuperAdmin(currentUser);
  const isCoopAdmin = isCooperativeAdmin(currentUser);
  const canManageMemberAccess = isCoopAdmin || hasRole(currentUser, ['FARM_ADMIN']);
  const showCommandCenter = canAccessCommandCenter(currentUser);
  const canViewCustomers = showAdminControls || hasRole(currentUser, ['FARMER']);
  const canViewMilkReport = Array.isArray(currentUser?.page_access)
    ? hasPageAccess(currentUser, 'reports') || hasPageAccess(currentUser, 'safety')
    : hasRole(currentUser, ['ADMIN', 'FARM_MANAGER', 'FARMER']);

  // Who may see each link (roles, plan, page access). Paths, groups and order: lib/navRoutes.
  const canSee = {
    systemAdmin: isPlatformAdmin,
    memberOnboarding: canManageMemberAccess,
    commandCenter: showCommandCenter,
    production: canSeeProductionLog(currentUser),
    milkUsage: hasPageAccess(currentUser, 'production'),
    dailyRoutine: hasPageAccess(currentUser, 'tasks'),
    farmTasks: canViewHerdsmanView && hasPageAccess(currentUser, 'tasks'),
    cowRegister: hasPageAccess(currentUser, 'herd'),
    breeding: canViewBreeding && hasPageAccess(currentUser, 'breeding'),
    medical: hasPageAccess(currentUser, 'medical'),
    milkDrops: hasPageAccess(currentUser, 'medical'),
    todayFeeding: Boolean(currentUser) && hasPageAccess(currentUser, 'feeding'),
    feedDashboard: canViewFeedNutrition && hasPageAccess(currentUser, 'feed'),
    feedMixes: canViewFeedNutrition && hasPageAccess(currentUser, 'feed'),
    ingredients: showAdminControls && hasPageAccess(currentUser, 'inventory'),
    milkLab: canViewFeedNutrition && hasPageAccess(currentUser, 'feed'),
    unitHelpers: hasRole(currentUser, UNIT_HELPER_ROLES) && hasPageAccess(currentUser, 'feed'),
    buyers: canSeeBuyers(currentUser),
    customers: canViewCustomers && hasPageAccess(currentUser, 'customers'),
    inventory: showAdminControls && hasPageAccess(currentUser, 'inventory'),
    ledger: canSeeLedger(currentUser),
    farmReports: canViewMilkReport && hasPageAccess(currentUser, 'reports'),
    customerValue: showAdminControls && hasPageAccess(currentUser, 'reports'),
    cowProfit: showAdminControls && hasPageAccess(currentUser, 'reports'),
    milkInventory: canViewMilkReport && hasPageAccess(currentUser, 'reports'),
    safety: canViewMilkReport && hasPageAccess(currentUser, 'safety'),
    staff: canViewStaffRegistry && hasPageAccess(currentUser, 'staff'),
    payroll: canViewPayroll && hasPageAccess(currentUser, 'payroll'),
  };
  const navGroups = NAV_GROUPS.map((id) => ({
    id,
    items: NAV_ROUTES.filter((route) => route.group === id)
      .map((route) => ({ ...route, label: copy.items[route.id], visible: Boolean(canSee[route.id]) })),
  }));

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      title: group.id ? copy.groups[group.id] : null,
      items: group.items.filter((item) => item.visible),
    }))
    .filter((group) => group.items.length > 0);
  const allNavItems = visibleGroups.flatMap((group) => group.items);

  // The same resolver the phone bottom nav uses (lib/navRoutes): one active link at most.
  const activeItem = activeNavRoute(location, allNavItems);
  const activeGroupId = activeItem?.group ?? null;

  // Moving to a page in a section the user folded unfolds it, so the current page's link is never hidden.
  const [shownActiveGroupId, setShownActiveGroupId] = useState(activeGroupId);
  if (activeGroupId !== shownActiveGroupId) {
    setShownActiveGroupId(activeGroupId);
    if (activeGroupId && collapsedGroups[activeGroupId]) {
      setCollapsedGroups((prev) => ({ ...prev, [activeGroupId]: false }));
    }
  }

  // collapsedGroups holds only the sections the user folded or unfolded; the rest use the default.
  // Desktop starts with every section open. The phone drawer starts with these folded, by id
  // (titles change with the language), except the one holding the current page.
  const isGroupCollapsed = (groupId) => {
    if (!groupId) return false;
    if (groupId in collapsedGroups) return collapsedGroups[groupId];
    return mobileOpen && groupId !== activeGroupId && PHONE_FOLDED_GROUPS.has(groupId);
  };

  const toggleGroup = (groupId) => {
    const next = !isGroupCollapsed(groupId);
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: next }));
  };

  // The phone drawer: Escape closes it and Tab stays inside while it's open.
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, mobileOpen, { onEscape: () => setMobileOpen(false) });
  // On phones the closed drawer is only slid off-screen; inert keeps Tab and screen readers out.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const drawerHidden = !mobileOpen && !isDesktop;

  return (
    <React.Fragment>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[19] animate-reveal bg-ink/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <aside ref={drawerRef} tabIndex={-1} inert={drawerHidden} aria-hidden={drawerHidden || undefined} className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300
        fixed inset-y-0 bottom-16 md:inset-y-0 md:left-0 md:bottom-0
        w-72 max-w-[85vw] md:w-60 md:max-w-none xl:w-64 h-auto md:h-screen
        border-r border-ink/10 bg-white
        flex flex-col overflow-hidden outline-none
        z-[25] md:z-20
      `}>

      {/* Logo Block */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink/10 bg-ink-900 px-4 md:px-6">
        <p className="m-0 text-body-strong text-white">
          {SITE.name}
        </p>
        <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden" aria-label={copy.closeMenu}><X size={20} aria-hidden="true" /></button>
      </div>

      <FarmSwitcher />

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24 sidebar-scrollbar flex flex-col gap-4 md:pb-4" aria-label={copy.mainLabel}>
        {visibleGroups.map((group) => (
          <div key={group.id || 'core'} className="flex flex-col gap-2">
            {group.title && (
              <div>
                {/* px-4 matches the items' 14px padding plus their 2px active border. */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`group w-full px-4 py-1.5 flex items-center justify-between text-xs font-extrabold tracking-wider uppercase rounded-md transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${activeGroupId === group.id ? 'text-brand-700' : 'text-ink-900'}`}
                  aria-expanded={!isGroupCollapsed(group.id)}
                  aria-label={copy.toggleSection(group.title)}
                >
                  <span>{group.title}</span>
                  <span className="text-ink-400 group-hover:text-ink-600">
                    {isGroupCollapsed(group.id) ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  </span>
                </button>
              </div>
            )}
            {!isGroupCollapsed(group.id) && (
            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const itemIsActive = activeItem?.id === item.id;

                return (
                  <Link
                    key={item.id}
                    to={navItemHref(item)}
                    onClick={() => setMobileOpen(false)}
                    aria-current={itemIsActive ? 'page' : undefined}
                    // Active state comes from activeNavRoute, which also reads the query.
                    // Hover is a plain light background only; the left border belongs to the active item.
                    className={`flex items-center pl-3.5 pr-4 py-3 min-h-[44px] font-sans font-semibold text-sm transition-colors duration-100 border-l-2 rounded-md relative ${
                      itemIsActive
                        ? 'border-brand-400 bg-ink-900 text-white'
                        : 'border-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            )}
          </div>
        ))}
      </nav>

    </aside>
    </React.Fragment>
  );
}
