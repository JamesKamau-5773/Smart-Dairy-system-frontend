import React from 'react';
import { Users, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BuyersLanding() {
  return (
    <div className="animate-reveal space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Users size={12} /> Buyers
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            Buyers <span className="text-ink-muted">Management</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Overview and quick actions for buyer relationships and statements.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/operations/buyers/registry" className="btn-command flex items-center gap-2">
            <ListChecks size={16} /> Open Directory
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-machined p-6">
          <h3 className="font-semibold text-sm text-ink-muted uppercase tracking-wider mb-3">Quick Actions</h3>
          <ul className="space-y-2 text-sm">
            <li>Create a new buyer profile</li>
            <li>Generate and share statement links</li>
            <li>Review outstanding balances</li>
          </ul>
        </div>
        <div className="card-machined p-6">
          <h3 className="font-semibold text-sm text-ink-muted uppercase tracking-wider mb-3">Recent Shares</h3>
          <div className="text-xs text-ink-muted">No statements shared in the last 7 days.</div>
        </div>
        <div className="card-machined p-6 bg-brand text-surface">
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Status</h3>
          <div className="text-sm">Buyer integrations healthy. Invoice delivery enabled.</div>
        </div>
      </div>
    </div>
  );
}
