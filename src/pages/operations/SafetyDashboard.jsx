import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import { Skeleton } from '../../components/ui';

const fetchHardlocks = async () => {
  // This will be replaced with a real API call.
  // For now, it uses the mock defined in `handlers.js`.
  const res = await apiClient.get('/veterinary/hardlocks/active');
  return res.data;
};

export default function MilkSafetyBoard() {
  const { data: hardlocksRaw, isLoading, error } = useQuery({
    queryKey: ['vet_hardlocks'],
    queryFn: fetchHardlocks,
  });

  const hardlocks = Array.isArray(hardlocksRaw)
    ? hardlocksRaw
    : Array.isArray(hardlocksRaw?.items)
      ? hardlocksRaw.items
      : Array.isArray(hardlocksRaw?.data)
        ? hardlocksRaw.data
        : [];

  const hasCritical = hardlocks.some((lock) => lock.severity === 'CRITICAL');

  return (
    <div className="animate-reveal space-y-8">
      <div className="flex justify-between items-end border-b border-ink/10 pb-6">
        <div>
          <h2 className="font-sans font-bold text-3xl text-brand">Milk Safety Board</h2>
          <p className="text-ink-muted text-sm mt-2">Live list of cows whose milk cannot be mixed or sold.</p>
        </div>
        <div className={`card-machined bg-surface/80 flex items-center gap-4 p-4 rounded-lg ${hasCritical ? 'border-danger' : 'border-success'}`}>
          {hasCritical ? <ShieldAlert className="text-danger" size={32} /> : <ShieldCheck className="text-success" size={32} />}
          <div>
            <p className={`font-bold text-xl ${hasCritical ? 'text-danger' : 'text-success'}`}>
              {hasCritical ? 'Warning: Do Not Mix!' : 'All Milk Safe'}
            </p>
            <p className="text-xs text-ink-muted">
              {hardlocks.length} {hardlocks.length === 1 ? 'cow' : 'cows'} on medicine
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card-machined bg-surface/80 p-6 rounded-lg space-y-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
        {error && <p className="text-danger">Could not load the safety list. Please check your connection.</p>}
        
        {hardlocks.map(lock => (
          <div key={lock.id} className={`card-machined bg-surface/80 p-6 rounded-lg border-l-4 ${lock.severity === 'CRITICAL' ? 'border-danger' : 'border-warning'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg text-ink-strong">{lock.cow_name}</p>
                <p className="font-mono text-xs text-ink-muted">
                  <Link to={`/operations/animal/${lock.cow_id}`} className="text-brand font-bold hover:underline">
                    Tag: {lock.cow_id}
                  </Link>
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${lock.severity === 'CRITICAL' ? 'bg-danger/20 text-danger-dark' : 'bg-warning/20 text-warning-dark'}`}>
                {lock.severity === 'CRITICAL' ? 'HIGH RISK' : 'CAUTION'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink-strong">Treated for: {lock.reason}</p>
              <p className="text-xs text-ink-muted mt-1">
                Medicine clears on: {new Date(lock.lock_expires).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        
        {!isLoading && !error && hardlocks.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-ink/10 rounded-xl bg-surface-warm/30">
             <ShieldCheck className="mx-auto text-success/50 mb-3" size={48} />
             <p className="text-lg font-bold text-ink-strong">No Active Medicine Warnings</p>
             <p className="text-sm text-ink-muted mt-1">Milk from all active cows is currently safe for the main tank.</p>
          </div>
        )}
      </div>
    </div>
  );
}