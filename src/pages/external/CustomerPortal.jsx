import React from 'react';
import { Droplets, Calendar, Receipt, ShieldCheck, Download, CheckCircle2 } from 'lucide-react';

export default function CustomerPortal() {
  // Mock Data: This would be fetched from your Flask API using the unique token in the URL
  const portalData = {
    customerName: "Rift Valley Cooperative",
    farmOrigin: "Bahati Dairies (Main Farm)",
    billingCycle: "May 2026",
    paymentTerms: "Monthly (Net 30)",
    totalAmountDue: 142500.00,
    todaysDelivery: {
      date: "May 25, 2026",
      volume: 120.5,
      antibiotics: "Negative",
      status: "Verified & Chilled"
    },
    // The detailed breakdown requested
    history: [
      { date: "May 25, 2026", volume: 120.5, rate: 54.00, dailyTotal: 6507.00, status: "Cleared" },
      { date: "May 24, 2026", volume: 118.0, rate: 54.00, dailyTotal: 6372.00, status: "Cleared" },
      { date: "May 23, 2026", volume: 122.5, rate: 53.50, dailyTotal: 6553.75, status: "Cleared" },
      { date: "May 22, 2026", volume: 119.0, rate: 54.00, dailyTotal: 6426.00, status: "Cleared" },
    ]
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex justify-center">
      
      {/* Container - Restricting width so it looks like a digital document */}
      <div className="w-full max-w-4xl animate-reveal space-y-6">
        
        {/* BRANDING HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand/5 text-brand px-3 py-1 mb-3 rounded-full font-semibold text-xs border border-brand/10">
              <ShieldCheck size={14} /> Official Supply Record
            </div>
            <h1 className="font-sans font-bold text-3xl text-brand">
              {portalData.farmOrigin}
            </h1>
            <p className="text-ink-muted mt-1">Issued to: <span className="font-semibold text-ink">{portalData.customerName}</span></p>
          </div>
          <button className="btn-command bg-surface text-brand border border-ink/10 shadow-sm flex items-center gap-2 text-sm">
            <Download size={16} /> Download PDF
          </button>
        </header>

        {/* TOP LEVEL: TODAY'S DELIVERY & TOTAL BILL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Today's Intake (Immediate Feedback) */}
          <div className="card-machined bg-surface/80 p-6 relative overflow-hidden text-ink-strong">
            <div className="absolute -right-10 -top-10 opacity-10">
              <Droplets size={150} />
            </div>
            <div className="relative z-10">
              <h3 className="font-semibold text-brand flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                <CheckCircle2 size={16} className="text-brand" /> Today's Received Volume
              </h3>
              <div className="text-5xl font-bold tracking-tight text-ink-strong mb-2">
                {portalData.todaysDelivery.volume} <span className="text-xl text-ink-muted font-medium">Litres</span>
              </div>
              
              
                <div>
                  <div className="text-xs text-ink-muted uppercase">Safety</div>
                  <div className="font-semibold text-brand">{portalData.todaysDelivery.antibiotics}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Billing Cycle (The Financials) */}
          <div className="card-machined bg-surface/80 p-6 text-ink-strong">
            <h3 className="font-semibold text-ink-muted flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
              <Receipt size={16} /> Current Billing Cycle
            </h3>
            <div className="text-4xl font-bold tracking-tight text-ink-strong mb-2">
              KSh {portalData.totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-muted mb-6">
              <Calendar size={14} /> {portalData.billingCycle} &mdash; {portalData.paymentTerms}
            </div>
            <div className="p-3 bg-brand/5 rounded-lg border border-brand/10 text-sm text-brand flex items-start gap-2">
               <span className="font-semibold mt-0.5">Note:</span>
               This total is dynamically adjusted based on daily lab quality premiums.
            </div>
          </div>
        </div>

        {/* BOTTOM LEVEL: THE GRANULAR BREAKDOWN */}
        <div className="card-machined overflow-hidden bg-surface/80 mt-8">
          <div className="p-6 border-b border-ink/10 flex justify-between items-center bg-white/35 backdrop-blur-sm">
            <h3 className="font-semibold text-brand text-lg">Supply Breakdown</h3>
            <span className="text-sm text-ink-muted">Sorted by Newest First</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand/10 text-ink-muted">
                <tr>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Date</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-ink-muted">Status</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right text-ink-muted">Volume (L)</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right text-ink-muted">Rate (KSh)</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right text-ink-muted">Daily Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {portalData.history.map((row, index) => (
                  <tr key={index} className="hover:bg-surface-warm/30 transition-colors">
                    <td className="p-4 font-medium text-ink">{row.date}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand/10 text-brand text-xs font-medium">
                        <CheckCircle2 size={12} /> {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-ink tabular-nums">{row.volume.toFixed(1)}</td>
                    <td className="p-4 text-right text-ink-muted tabular-nums">{row.rate.toFixed(2)}</td>
                    <td className="p-4 text-right font-semibold text-brand tabular-nums">{row.dailyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    
  );
}