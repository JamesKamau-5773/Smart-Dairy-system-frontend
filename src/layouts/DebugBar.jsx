import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldCheck } from 'lucide-react';
import DevToggle from '../components/ui/DevToggle';
import OfflineIndicator from '../components/ui/OfflineIndicator';
import OfflineQueueInspector from '../components/ui/OfflineQueueInspector';
import { healthApi } from '../lib/backendApi';

const isDevelopment = import.meta.env.DEV
  || globalThis.process?.env?.NODE_ENV === 'development';

export default function DebugBar() {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { data: health } = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => healthApi.status(),
    refetchInterval: 30000,
    enabled: isDevelopment,
  });

  if (!isDevelopment) return null;

  const backendHealthy = Boolean(health?.status || health?.ok);

  return (
    <>
      <aside className="fixed inset-x-0 bottom-20 z-[70] border-t border-brand-400 bg-ink-950 px-3 py-2 text-white md:bottom-0 md:left-60 xl:left-64" aria-label="Development diagnostics">
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex shrink-0 items-center gap-2 border-r border-white/20 pr-3 text-xs font-bold uppercase">
            <Activity size={15} className="text-brand-400" /> Debug Bar
          </div>
          <DevToggle />
          <OfflineIndicator onOpenInspector={() => setInspectorOpen(true)} />
          <div className={`shrink-0 rounded-input border px-3 py-1.5 text-xs font-semibold ${backendHealthy ? 'border-brand-400/40 bg-brand-900 text-brand-100' : 'border-warning-500/50 bg-warning-500/10 text-warning-50'}`}>
            {backendHealthy ? 'Backend Healthy' : 'Backend Syncing'}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-input border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <ShieldCheck size={14} className="text-brand-400" /> Status Secure
          </div>
        </div>
      </aside>
      <OfflineQueueInspector isOpen={inspectorOpen} onClose={() => setInspectorOpen(false)} />
    </>
  );
}
