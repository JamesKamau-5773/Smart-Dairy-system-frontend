import React from 'react';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';
import DevToggle from '../components/ui/DevToggle';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import { useState } from 'react';

export default function Header() {
  const { activeFarm } = useTenant();
  const { currentUser } = useAuth();
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <header className="h-16 bg-surface border-b border-ink/10 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="font-display font-semibold tracking-normal text-brand m-0 flex items-center">
          Status <ShieldCheck size={18} className="text-accent ml-2 mr-1" /> <span className="text-accent">Secure</span>
        </h2>
        <div className="h-6 w-1 bg-ink opacity-20"></div>
        <span className="font-sans font-medium text-sm text-ink-muted">
          {activeFarm?.name || 'Initializing'}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <DevToggle />
        <OfflineIndicator onOpenInspector={() => setInspectorOpen(true)} />
        <OfflineQueueInspector isOpen={inspectorOpen} onClose={() => setInspectorOpen(false)} />
        <div className="font-sans text-sm text-ink font-medium bg-surface-raised px-3 py-1 border border-ink/20 shadow-[0_6px_18px_rgba(2,132,199,0.16)] rounded-md">
          Role: {currentUser?.role || 'N/A'}
        </div>
      </div>
    </header>
  );
}