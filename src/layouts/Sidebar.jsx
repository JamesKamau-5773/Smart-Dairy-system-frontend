import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Beaker, Pill, Package, Wallet, LogOut, Menu, X, 
  Users, Dna, Landmark, ShieldCheck, BookHeart, BookOpen, Activity, 
  Wheat, ChevronRight, ChevronDown, FileWarning 
} from 'lucide-react';
import LABELS from '../lib/labels';
import { useAuth } from '../contexts/AuthContext';
import FarmSwitcher from './FarmSwitcher';
import { canAccessCommandCenter, canViewAdminControls, isCooperativeAdmin, isSuperAdmin } from '../lib/roles';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const mobileDefaultCollapsedGroups = () => ({
    'Herd Management': true,
    'Feed Planning': true,
    'Finance & Supply': true,
    Compliance: true,
    'Human Resources': true,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showAdminControls = canViewAdminControls(currentUser);
  const canViewBreeding = true;
  const canViewBuyers = showAdminControls;
  const canViewHR = showAdminControls;
  const canViewHerdsmanView = true;
  const canViewFeedNutrition = showAdminControls || Boolean(currentUser);
  const herdsmanViewLabel = 'Farm Task View';
  const isPlatformAdmin = isSuperAdmin(currentUser);
  const isCoopAdmin = isCooperativeAdmin(currentUser);
  const showCommandCenter = canAccessCommandCenter(currentUser);

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
        { label: 'Member Onboarding', to: '/cooperative-admin/members', icon: Users, visible: isCoopAdmin },
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
        { label: 'Customer Payments', to: '/finance/buyers', icon: Users, visible: canViewBuyers },
        { label: 'Inventory', to: '/operations/inventory', icon: Package, visible: showAdminControls },
        { label: 'Ledger', to: '/finance/ledger', icon: Wallet, visible: showAdminControls },
      ],
    },
    {
      title: 'Compliance',
      items: [
        { label: 'Safety Dashboard', to: '/operations/safety', icon: ShieldCheck, visible: true },
      ],
    },
    {
      title: 'Human Resources',
      items: [
        { label: 'Staff Registry', to: '/hr/staff', icon: Users, visible: canViewHR },
        { label: 'Payroll', to: '/hr/payroll', icon: Landmark, visible: canViewHR },
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
        className="md:hidden fixed top-4 left-4 z-30 p-2 min-h-[44px] min-w-[44px] bg-brand text-surface rounded-lg shadow-lg"
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
                        ? 'bg-gray-50 text-gray-900 border-slate-900 pl-4'
                        : `border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50 ${itemIsActive ? 'bg-gray-50 text-gray-900' : ''}`
                    }`}
                  >
                    <Icon size={18} className="mr-3 shrink-0 text-slate-500" /> {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Operator Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-gray-700 font-sans text-xs font-medium mb-3 truncate">
          Operator: {currentUser?.name || 'Unknown'}
        </p>
        <button 
          onClick={handleLogout}
          className="btn-command w-full min-h-[44px] bg-red-600 text-white hover:bg-red-700 flex items-center justify-center text-xs py-2 rounded-md font-semibold"
        >
          <LogOut size={14} className="mr-2 shrink-0" /> Sign out
        </button>
      </div>
    </aside>
    </React.Fragment>
  );
}