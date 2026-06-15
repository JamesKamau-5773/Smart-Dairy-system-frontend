import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export default function DashboardLayout() {
  return (
    <div className="h-dvh w-full bg-white relative overflow-hidden isolate">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #14b8a6 100%)',
          backgroundSize: '100% 100%',
        }}
      />

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