import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FarmSwitcher from './FarmSwitcher';
import { canSeeBuyers, canSeeLedger, canSeeProductionLog, UNIT_HELPER_ROLES } from '../lib/navAccess';
import { canAccessCommandCenter, canViewAdminControls, isCooperativeAdmin, isSuperAdmin, hasRole, hasPageAccess } from '../lib/roles';
import { isNavItemActive, navItemHref } from '../lib/navigation';
import { FEED_CATEGORY } from '../lib/inventoryItemRules';
import { shellCopy } from '../i18n/shell';
import { SITE } from '../landing/content';

const { nav: copy } = shellCopy;

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Sections that start folded on phones, by id (titles change with the language).
  const mobileDefaultCollapsedGroups = () => ({
    herd: true,
    feeding: true,
    finance: true,
    reports: true,
    compliance: true,
    hr: true,
  });

  useEffect(() => {
    if (mobileOpen && Object.keys(collapsedGroups).length === 0) {
      setCollapsedGroups(mobileDefaultCollapsedGroups());
    }
  }, [mobileOpen]);

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

  const navGroups = [
    {
      id: 'platform',
      items: [
        { label: copy.items.systemAdmin, to: '/system-admin/dashboard', visible: isPlatformAdmin },
      ],
    },
    {
      id: 'cooperative',
      items: [
        { label: copy.items.memberOnboarding, to: '/cooperative-admin/members', visible: canManageMemberAccess },
      ],
    },
    {
      id: null,
      items: [
        { label: copy.items.commandCenter, to: '/dashboard', visible: showCommandCenter },
      ],
    },
    {
      id: 'operations',
      items: [
        { label: copy.items.production, to: '/operations/yield', visible: canSeeProductionLog(currentUser) },
        { label: copy.items.milkUsage, to: '/operations/milk-usage', visible: hasPageAccess(currentUser, 'production') },
        { label: copy.items.dailyRoutine, to: '/operations/routine', visible: hasPageAccess(currentUser, 'tasks') },
        { label: copy.items.farmTasks, to: '/tasks', visible: canViewHerdsmanView && hasPageAccess(currentUser, 'tasks') },
      ],
    },
    {
      id: 'herd',
      items: [
        { label: copy.items.cowRegister, to: '/operations/herd', visible: hasPageAccess(currentUser, 'herd') },
        { label: copy.items.breeding, to: '/operations/breeding', visible: canViewBreeding && hasPageAccess(currentUser, 'breeding') },
        { label: copy.items.medical, to: '/operations/records', visible: hasPageAccess(currentUser, 'medical') },
        // NEW: Added Milk Drop Reports right under Medical Records
        { label: copy.items.milkDrops, to: '/operations/milk-drop-reports', visible: hasPageAccess(currentUser, 'medical') },
      ],
    },
    {
      id: 'feeding',
      items: [
        { label: copy.items.todayFeeding, to: '/feeding', visible: Boolean(currentUser) && hasPageAccess(currentUser, 'feeding') },
        { label: copy.items.feedDashboard, to: '/feed-nutrition', visible: canViewFeedNutrition && hasPageAccess(currentUser, 'feed'), exact: true },
        { label: copy.items.feedMixes, to: '/feed-nutrition/mix', visible: canViewFeedNutrition && hasPageAccess(currentUser, 'feed') },
        // Inventory filtered to feed: one page, two ways in (Feeding and Finance & Supply).
        { label: copy.items.ingredients, to: '/operations/inventory', query: { category: FEED_CATEGORY }, visible: showAdminControls && hasPageAccess(currentUser, 'inventory') },
        { label: copy.items.milkLab, to: '/operations/lab', visible: canViewFeedNutrition && hasPageAccess(currentUser, 'feed') },
        // Straight to the page (not the old /settings redirect), shown only to the roles its route allows.
        { label: copy.items.unitHelpers, to: '/operations/unit-conversions', visible: hasRole(currentUser, UNIT_HELPER_ROLES) && hasPageAccess(currentUser, 'feed') },
      ],
    },
    {
      id: 'finance',
      items: [
        { label: copy.items.buyers, to: '/finance/buyers', visible: canSeeBuyers(currentUser) },
        { label: copy.items.customers, to: '/operations/customers', visible: canViewCustomers && hasPageAccess(currentUser, 'customers') },
        { label: copy.items.inventory, to: '/operations/inventory', visible: showAdminControls && hasPageAccess(currentUser, 'inventory') },
        { label: copy.items.ledger, to: '/finance/ledger', visible: canSeeLedger(currentUser) },
      ],
    },
    {
      id: 'reports',
      items: [
        { label: copy.items.farmReports, to: '/operations/reports', visible: canViewMilkReport && hasPageAccess(currentUser, 'reports') },
        { label: copy.items.customerValue, to: '/finance/reports/dairy-unit-economics', visible: showAdminControls && hasPageAccess(currentUser, 'reports') },
        { label: copy.items.cowProfit, to: '/finance/reports/animal-economics', visible: showAdminControls && hasPageAccess(currentUser, 'reports') },
        { label: copy.items.milkInventory, to: '/operations/reports/milk-inventory', visible: canViewMilkReport && hasPageAccess(currentUser, 'reports') },
      ],
    },
    {
      id: 'compliance',
      items: [
        { label: copy.items.safety, to: '/operations/safety', visible: canViewMilkReport && hasPageAccess(currentUser, 'safety') },
      ],
    },
    {
      id: 'hr',
      items: [
        { label: copy.items.staff, to: '/hr/staff', visible: canViewStaffRegistry && hasPageAccess(currentUser, 'staff') },
        { label: copy.items.payroll, to: '/hr/payroll', visible: canViewPayroll && hasPageAccess(currentUser, 'payroll') },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      title: group.id ? copy.groups[group.id] : null,
      items: group.items.filter((item) => item.visible),
    }))
    .filter((group) => group.items.length > 0);
  const allNavItems = visibleGroups.flatMap((group) => group.items);

  const activeGroupId = visibleGroups.find((group) =>
    group.items.some((item) => isNavItemActive(item, location, allNavItems))
  )?.id || null;

  const isGroupCollapsed = (groupId) =>
    mobileOpen && Boolean(groupId) && Boolean(collapsedGroups[groupId]);

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
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
                  onClick={() => mobileOpen && toggleGroup(group.id)}
                  className={`w-full px-4 py-1.5 flex items-center justify-between text-xs font-bold tracking-wider uppercase rounded-md md:py-0 md:cursor-default transition-colors ${activeGroupId === group.id ? 'text-ink-700' : 'text-ink-400'}`}
                  aria-expanded={mobileOpen ? !isGroupCollapsed(group.id) : true}
                  aria-label={copy.toggleSection(group.title)}
                >
                  <span>{group.title}</span>
                  <span className="md:hidden">
                    {isGroupCollapsed(group.id) ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  </span>
                </button>
              </div>
            )}
            <div className={`flex-col gap-2 ${group.id && isGroupCollapsed(group.id) ? 'hidden md:flex' : 'flex'}`}>
              {group.items.map((item) => {
                const itemIsActive = isNavItemActive(item, location, allNavItems);

                return (
                  <NavLink
                    key={navItemHref(item)}
                    to={navItemHref(item)}
                    end={item.exact}
                    onClick={() => setMobileOpen(false)}
                    aria-current={itemIsActive ? 'page' : undefined}
                    // Active state comes from isNavItemActive, which also reads the query.
                    // Hover is a plain light background only; the left border belongs to the active item.
                    className={`flex items-center pl-3.5 pr-4 py-3 min-h-[44px] font-sans font-semibold text-sm transition-colors duration-100 border-l-2 rounded-md relative ${
                      itemIsActive
                        ? 'border-brand-400 bg-ink-900 text-white'
                        : 'border-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
    </React.Fragment>
  );
}
