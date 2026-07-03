import React from 'react';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';
import DevToggle from '../components/ui/DevToggle';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../lib/backendApi';

export default function Header() {
  const { activeFarm } = useTenant();
  const { currentUser } = useAuth();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { data: health } = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => healthApi.status(),
    refetchInterval: 30000,
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur-0">
      <div className="flex items-center gap-4">
        <h2 className="font-display m-0 flex items-center font-semibold tracking-normal text-slate-900">
          Status <ShieldCheck size={18} className="ml-2 mr-1 text-emerald-600" /> <span className="text-emerald-700">Secure</span>
        </h2>
        <div className="h-6 w-px bg-gray-200"></div>
        <span className="font-sans text-sm font-medium text-gray-600">
          {activeFarm?.name || 'Initializing'}
        </span>
      </div>
      
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <DevToggle />
        <OfflineIndicator onOpenInspector={() => setInspectorOpen(true)} />
        <OfflineQueueInspector isOpen={inspectorOpen} onClose={() => setInspectorOpen(false)} />
        <div className="font-sans rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
          {health?.status || health?.ok ? 'Backend Healthy' : 'Backend Syncing'}
        </div>
        <div className="font-sans rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
          Role: {currentUser?.role || 'N/A'}
        </div>
      </div>
    </header>
  );
}