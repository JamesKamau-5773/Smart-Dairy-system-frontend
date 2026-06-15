import React, { useState } from 'react';
import { Users, Search, Building2, Link as LinkIcon, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import AlertBanner from '../../components/ui/AlertBanner';

export default function BuyerRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [banner, setBanner] = useState(null);

  // Mock CRM Data: In production, fetch from /api/buyers
  const buyers = [
    {
      id: "B-101",
      name: "Rift Valley Cooperative",
      type: "Cooperative",
      contact: "0722 123 456",
      outstanding: 142500.00,
      lastDelivery: "May 25, 2026",
      status: "Active",
      contract: "Monthly (Net 30)"
    },
    {
      id: "B-102",
      name: "Highland Processors Ltd",
      type: "Commercial",
      contact: "0733 987 654",
      outstanding: 45000.00,
      lastDelivery: "May 22, 2026",
      status: "Active",
      contract: "Weekly"
    },
    {
      id: "B-103",
      name: "Bahati Local Market",
      type: "Direct Retail",
      contact: "0711 555 444",
      outstanding: 0.00,
      lastDelivery: "May 25, 2026",
      status: "Cash Only",
      contract: "Daily"
    }
  ];

  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-reveal space-y-8">
      {banner && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type={banner.type} title={banner.title} message={banner.message} autoDismiss={4000} onDismiss={() => setBanner(null)} />
        </div>
      )}
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Users size={12} /> Customer Management
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            Customer <span className="text-ink-muted">Directory</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Manage commercial contracts and generate statements.</p>
        </div>
        <button className="btn-command flex items-center gap-2 text-sm">
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      {/* QUICK METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-machined bg-surface/80 p-6 flex flex-col justify-between">
          <span className="font-semibold text-xs text-ink-muted uppercase tracking-wider mb-2">Total Money Owed</span>
          <div className="text-3xl font-bold text-ink-strong tabular-nums">
            KSh 187,500<span className="text-sm text-ink-muted">.00</span>
          </div>
        </div>
        <div className="card-machined bg-surface/80 p-6 flex flex-col justify-between">
          <span className="font-semibold text-xs text-ink-muted uppercase tracking-wider mb-2">Active Contracts</span>
          <div className="text-3xl font-bold text-ink-strong tabular-nums">03</div>
        </div>
        <div className="card-machined bg-surface/80 p-6 flex flex-col justify-between">
          <span className="font-semibold text-xs text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> System Status
          </span>
          <div className="text-lg font-medium leading-tight text-ink-strong">
            All partner portals are currently synced and accessible.
          </div>
        </div>
      </div>

      {/* CRM MAIN INTERFACE */}
      <div className="card-machined overflow-hidden bg-surface/80">
        
        {/* Search & Filter Toolbar */}
        <div className="p-6 border-b border-ink/10 bg-white/35 flex gap-4 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input 
              type="text" 
              placeholder="Search partners by name..." 
              className="input-machined pl-10 !py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand/10 text-ink-muted">
              <tr>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Customer Name</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Payment Plan</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right text-ink-muted">Amount Owed (KSh)</th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-center text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filteredBuyers.map((buyer) => (
                <tr key={buyer.id} className="hover:bg-surface-warm/30 transition-colors group">
                  
                  {/* Identity Column */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand/5 text-brand rounded-lg border border-brand/10">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-brand text-sm">{buyer.name}</div>
                        <div className="font-mono text-[10px] text-ink-muted">{buyer.id} • {buyer.contact}</div>
                      </div>
                    </div>
                  </td>

                  {/* Contract Column */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex w-2 h-2 rounded-full ${buyer.status === 'Active' ? 'bg-accent' : 'bg-ink-muted'}`}></span>
                      <span className="font-medium text-sm text-ink">{buyer.contract}</span>
                    </div>
                    <div className="text-xs text-ink-muted mt-1">Last Delivery: {buyer.lastDelivery}</div>
                  </td>

                  {/* Financial Column */}
                  <td className="p-4 text-right">
                    <div className={`font-semibold tabular-nums ${buyer.outstanding > 0 ? 'text-danger' : 'text-ink'}`}>
                      {buyer.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Action Column - The "Share Link" Trigger */}
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        className="p-2 text-brand hover:bg-brand/10 rounded border border-transparent hover:border-brand/20 transition-all"
                        title="Generate Encrypted Link"
                        onClick={() => setBanner({ type: 'info', title: 'Link Generated', message: `Generated secure link for ${buyer.name}: https://jivu.farm/shared/statement/tk_8x9a2b` })}
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button 
                        className="p-2 text-ink-muted hover:text-brand hover:bg-surface-raised rounded transition-colors"
                        title="View Full Ledger"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                  </td>
                  
                </tr>
              ))}
              
              {filteredBuyers.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-ink-muted flex flex-col items-center">
                    <AlertCircle size={24} className="mb-2 opacity-50" />
                    No partners found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}