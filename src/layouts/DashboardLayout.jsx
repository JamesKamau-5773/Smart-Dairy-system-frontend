import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export default function DashboardLayout() {
  return (
    <div className="relative isolate h-dvh w-full overflow-hidden bg-[#f9f8f6]">

      <div className="relative z-10 flex h-dvh flex-col md:flex-row">
      <Sidebar />

      {/* Main Content Area - responsive layout */}
      <main className="relative z-10 flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-20 md:pl-60 xl:pl-64 md:pb-0">
        
        <Header />
        
        {/* Page Content Injection - responsive padding */}
        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />

      </div>

    </div>
  );
}