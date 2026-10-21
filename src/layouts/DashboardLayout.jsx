import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import DebugBar from './DebugBar';
import { useState } from 'react';

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
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />
      <DebugBar />

      </div>

    </div>
  );
}
