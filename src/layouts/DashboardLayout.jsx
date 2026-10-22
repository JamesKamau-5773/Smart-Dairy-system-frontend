import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import DebugBar from './DebugBar';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPageAccess } from '../lib/roles';

const routeAccess = [
  ['/dashboard', 'dashboard'], ['/operations/yield', 'production'], ['/operations/milk-usage', 'production'],
  ['/operations/routine', 'tasks'], ['/tasks', 'tasks'], ['/operations/herd', 'herd'],
  ['/operations/breeding', 'breeding'], ['/operations/records', 'medical'], ['/operations/milk-drop-reports', 'medical'],
  ['/feed-nutrition', 'feed'], ['/operations/lab', 'feed'], ['/settings/unit-conversions', 'feed'],
  ['/operations/customers', 'customers'], ['/finance/buyers', 'customers'], ['/finance/ledger', 'finance'],
  ['/operations/inventory', 'inventory'], ['/operations/reports', 'reports'], ['/finance/reports', 'reports'],
  ['/operations/safety', 'safety'], ['/hr/staff', 'staff'], ['/hr/payroll', 'payroll'], ['/cooperative-admin/members', 'member_admin'],
];

function PageAccessGate({ children }) {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const access = routeAccess.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1];
  if (access && !hasPageAccess(currentUser, access)) {
    const allowedPath = routeAccess.find(([, pageKey]) => hasPageAccess(currentUser, pageKey))?.[0] ?? '/login';
    return <Navigate to={allowedPath} replace />;
  }
  return children;
}

const isDevelopment = import.meta.env.DEV
  || globalThis.process?.env?.NODE_ENV === 'development';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="relative isolate h-dvh w-full overflow-hidden bg-background">

      <div className="relative z-10 flex h-dvh flex-col md:flex-row">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area - responsive layout */}
      <main className={`relative z-10 flex h-dvh min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain md:pl-60 xl:pl-64 ${isDevelopment ? 'pb-40 md:pb-16' : 'pb-24 md:pb-0'}`}>
        
        <Header onMenuClick={() => setMobileMenuOpen((open) => !open)} />
        
        {/* Page Content Injection - responsive padding */}
        <div className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
          <PageAccessGate><Outlet /></PageAccessGate>
        </div>
      </main>

      <MobileBottomNav />
      <DebugBar />

      </div>

    </div>
  );
}
