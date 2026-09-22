import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Beaker, Pill, Package, Wallet, Menu, X,
  Users, Dna, Landmark, ShieldCheck, BookHeart, BookOpen, Activity,
  Wheat, ChevronRight, ChevronDown, FileWarning, ClipboardList, TrendingUp, Droplets
} from 'lucide-react';
import LABELS from '../lib/labels';
import { useAuth } from '../contexts/AuthContext';
import FarmSwitcher from './FarmSwitcher';
import { canAccessCommandCenter, canViewAdminControls, isCooperativeAdmin, isSuperAdmin, hasRole } from '../lib/roles';

export default function Sidebar() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const mobileDefaultCollapsedGroups = () => ({
    'Herd Management': true,
    'Feed Planning': true,
    'Finance & Supply': true,
    Reports: true,
    Compliance: true,
    'Human Resources': true,
  });

  const showAdminControls = canViewAdminControls(currentUser);
  const canViewBreeding = true;
  const canViewBuyers = showAdminControls;
  const canViewStaffRegistry = showAdminControls || hasRole(currentUser, ['FARMER']);
  const canViewPayroll = showAdminControls;
  const canViewHerdsmanView = true;
  const canViewFeedNutrition = showAdminControls || Boolean(currentUser);
  const herdsmanViewLabel = 'Farm Task View';
  const isPlatformAdmin = isSuperAdmin(currentUser);
  const isCoopAdmin = isCooperativeAdmin(currentUser);
  const canManageMemberAccess = isCoopAdmin || hasRole(currentUser, ['FARM_ADMIN']);
  const showCommandCenter = canAccessCommandCenter(currentUser);
  const canViewCustomers = showAdminControls || hasRole(currentUser, ['FARMER']);
  const canViewMilkReport = hasRole(currentUser, ['ADMIN', 'FARM_MANAGER', 'FARMER']);

  const navGroups = [
    {
      title: 'Platform',
      items: [
        { label: 'System Admin Dashboard', to: '/system-admin/dashboard', icon: LayoutDashboard, visible: isPlatformAdmin },
      ],
    },
    {
      title: 'Cooperative Admin',
      items: [
        { label: 'Member Onboarding', to: '/cooperative-admin/members', icon: Users, visible: canManageMemberAccess },
      ],
    },
    {
      title: null,
      items: [
        { label: LABELS.COMMAND_CENTER, to: '/dashboard', icon: LayoutDashboard, visible: showCommandCenter },
      ],
    },
    {
      title: LABELS.OPERATIONS,
      items: [
        { label: LABELS.PRODUCTION_LOG, to: '/operations/yield', icon: Beaker, visible: true },
        { label: 'Milk Usage', to: '/operations/milk-usage', icon: Droplets, visible: true },
        { label: LABELS.DAILY_ROUTINE, to: '/operations/routine', icon: Activity, visible: true },
        { label: herdsmanViewLabel, to: '/tasks', icon: Activity, visible: canViewHerdsmanView },
      ],
    },
    {
      title: 'Herd Management',
      items: [
        { label: 'Cow Register', to: '/operations/herd', icon: BookOpen, visible: true },
        { label: 'Breeding & Genetics', to: '/operations/breeding', icon: Dna, visible: canViewBreeding },
        { label: LABELS.MEDICAL_RECORDS, to: '/operations/records', icon: BookHeart, visible: true },
        // NEW: Added Milk Drop Reports right under Medical Records
        { label: 'Milk Drop Alerts', to: '/operations/milk-drop-reports', icon: FileWarning, visible: true },
      ],
    },
    {
      title: LABELS.FEED_NUTRITION || 'Feed Planning',
      items: [
        { label: LABELS.FEED_DASHBOARD || LABELS.NUTRITION_PLANNER, to: '/feed-nutrition', icon: Wheat, visible: canViewFeedNutrition, exact: true },
        { label: LABELS.FEED_FORMULATION, to: '/feed-nutrition/mix', icon: Dna, visible: canViewFeedNutrition },
        { label: LABELS.MILK_LAB, to: '/operations/lab', icon: Pill, visible: canViewFeedNutrition },
        { label: 'Unit Helpers', to: '/settings/unit-conversions', icon: BookOpen, visible: canViewFeedNutrition },
      ],
    },
    {
      title: 'Finance & Supply',
      items: [
        { label: 'Buyers List', to: '/finance/buyers', icon: Users, visible: canViewBuyers },
        { label: 'Customer Management', to: '/operations/customers', icon: Users, visible: canViewCustomers },
        { label: 'Inventory', to: '/operations/inventory', icon: Package, visible: showAdminControls },
        { label: 'Ledger', to: '/finance/ledger', icon: Wallet, visible: showAdminControls },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Customer Value & Profit', to: '/finance/reports/dairy-unit-economics', icon: TrendingUp, visible: showAdminControls },
        { label: 'Cow Profitability', to: '/finance/reports/animal-economics', icon: TrendingUp, visible: showAdminControls },
        { label: 'Milk Inventory Report', to: '/operations/reports/milk-inventory', icon: ClipboardList, visible: canViewMilkReport },
      ],
    },
    {
      title: 'Compliance',
      items: [
        { label: 'Safety Dashboard', to: '/operations/safety', icon: ShieldCheck, visible: canViewMilkReport },
      ],
    },
    {
      title: 'Human Resources',
      items: [
        { label: 'Staff Registry', to: '/hr/staff', icon: Users, visible: canViewStaffRegistry },
        { label: 'Payroll', to: '/hr/payroll', icon: Landmark, visible: canViewPayroll },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.visible),
    }))
    .filter((group) => group.items.length > 0);

  const activeGroupTitle = visibleGroups.find((group) =>
    group.items.some((item) => {
      return item.exact
        ? location.pathname === item.to
        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    })
  )?.title || null;

  const isGroupCollapsed = (groupTitle) =>
    mobileOpen && Boolean(groupTitle) && Boolean(collapsedGroups[groupTitle]);

  const handleMobileToggle = () => {
    setMobileOpen((prev) => {
      const next = !prev;
      if (next) {
        setCollapsedGroups((current) => Object.keys(current).length > 0 ? current : mobileDefaultCollapsedGroups());
      }
      return next;
    });
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <React.Fragment>
      {/* Mobile Hamburger Button */}
      <button
        onClick={handleMobileToggle}
        className="md:hidden fixed top-4 left-4 z-30 p-2 min-h-[44px] min-w-[44px] bg-brand text-surface rounded-lg "
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[19] bg-black/40 animate-reveal"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <aside className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300
        fixed md:fixed md:inset-y-0 md:left-0
        w-64 md:w-60 xl:w-64 h-screen md:h-screen
        bg-white border-r border-gray-200
        flex flex-col overflow-hidden
        z-[25] md:z-20
      `}>

      {/* Logo Block */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-slate-900">
        <h1 className="text-white font-display font-semibold text-lg m-0 leading-tight">
          Jivu Smart Dairy
        </h1>
      </div>

      <FarmSwitcher />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scrollbar overscroll-contain p-4 flex flex-col gap-4" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <div key={group.title || 'core'} className="flex flex-col gap-2">
            {group.title && (
              <div className="px-2">
                <button
                  type="button"
                  onClick={() => mobileOpen && toggleGroup(group.title)}
                  className={`w-full px-2 py-1.5 flex items-center justify-between text-xs font-bold tracking-wider uppercase rounded-md md:px-4 md:py-0 md:cursor-default transition-colors ${activeGroupTitle === group.title ? 'text-slate-700' : 'text-gray-400'}`}
                  aria-expanded={mobileOpen ? !isGroupCollapsed(group.title) : true}
                  aria-label={`Toggle ${group.title} section`}
                >
                  <span>{group.title}</span>
                  <span className="md:hidden">
                    {isGroupCollapsed(group.title) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>
              </div>
            )}
            <div className={`flex-col gap-2 ${group.title && isGroupCollapsed(group.title) ? 'hidden md:flex' : 'flex'}`}>
              {group.items.map((item) => {
                const Icon = item.icon;

                const itemIsActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center px-4 py-3 min-h-[44px] font-sans font-semibold text-sm transition-colors duration-100 border-l-2 rounded-md relative ${
                      isActive
                        ? 'border-brand-400 bg-ink-900 pl-4 text-white'
                        : `border-transparent text-slate-600 hover:border-brand-400/50 hover:bg-brand-50 hover:text-ink-900 ${itemIsActive ? 'border-brand-400 bg-ink-900 text-white' : ''}`
                    }`}
                  >
                    <Icon size={18} className={`mr-3 shrink-0 ${itemIsActive ? 'text-brand-400' : 'text-slate-600'}`} /> {item.label}
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
