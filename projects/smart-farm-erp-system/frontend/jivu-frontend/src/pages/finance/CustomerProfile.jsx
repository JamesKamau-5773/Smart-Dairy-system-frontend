import React, { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, MessageSquare, ReceiptText, Wallet, Droplets, 
  CalendarDays, Phone, CheckCircle2, Clock3, FileText, Send 
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { buildWhatsAppInvoiceMessage, formatMoney } from '../../lib/billing';
import { Skeleton } from '../../components/ui';
import { financeApi } from '../../lib/backendApi';

function openWhatsApp(phoneNumber, message) {
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function CustomerProfile() {
  const params = useParams();
  const buyerId = params.id || params.buyerId; 
  
  const navigate = useNavigate();
  const { tenantId, farmId } = useTenant();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['finance-buyer-profile', tenantId, farmId, buyerId],
    queryFn: () => financeApi.getBuyerProfile(buyerId),
    enabled: !!buyerId,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const message = buildWhatsAppInvoiceMessage(profile);
      openWhatsApp(profile.buyer.whatsapp, message);
      return message;
    },
    onError: (error) => {
      console.error("Failed to generate or share WhatsApp invoice:", error);
      // A user-facing notification could be added here.
    },
  });

  const totals = useMemo(() => {
    if (!profile) return null;
    return [
      { label: 'Total Invoiced', value: profile.summary.invoice_total, icon: ReceiptText, tone: 'text-ink-strong' },
      { label: 'Total Paid', value: profile.summary.payments_received, icon: Wallet, tone: 'text-success-dark' },
      { label: 'Current Balance', value: profile.summary.outstanding_balance, icon: FileText, tone: profile.summary.outstanding_balance > 0 ? 'text-brand' : 'text-success-dark' },
      { label: '30-Day Volume', value: `${profile.summary.liters_delivered} L`, icon: Droplets, tone: 'text-ink-strong' },
    ];
  }, [profile]);

  return (
    <div className="animate-reveal space-y-6">
      
      {/* ── BREADCRUMBS ── */}
      <div className="flex items-center gap-3 border-b border-ink/10 pb-4">
        <button onClick={() => navigate('/finance/buyers')} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={16} /> Back to Directory
        </button>
        <span className="text-ink/20">|</span>
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-muted">
          <CalendarDays size={12} /> Customer Billing Dashboard
        </div>
      </div>

      {/* ── HEADER ── */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h1 className="font-sans font-black text-3xl text-ink tracking-tight m-0">{profile?.buyer.name || '...'}</h1>
          <p className="font-mono text-xs text-ink-muted mt-2">ID: {profile?.buyer.id || '...'} • Financial overview and delivery logs.</p>
        </div>
        {profile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-ink/10 rounded-lg text-sm font-bold text-ink-strong">
            <Phone size={14} className="text-ink-muted" /> {profile.buyer.contact}
          </div>
        )}
      </div>

      {/* ── KPI GRID ── */}
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {totals.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-surface border border-ink/10 rounded-lg p-5">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-ink-muted">
                  <span>{card.label}</span>
                  <Icon size={14} className="text-ink/40" />
                </div>
                <div className={`mt-4 text-2xl font-black tabular-nums ${card.tone}`}>
                  {typeof card.value === 'number' ? formatMoney(card.value) : card.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONTENT GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-surface rounded-lg border border-ink/10 overflow-hidden">
          <div className="p-5 border-b border-ink/10 bg-surface-raised/50 flex items-center justify-between">
            <h3 className="font-bold text-ink-strong text-sm flex items-center gap-2"><Clock3 size={16} className="text-brand" /> Consumption Breakdown</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-raised border-b border-ink/10">
              <tr>
                <th className="px-5 py-3 text-[10px] uppercase font-black tracking-widest text-ink-muted">Date</th>
                <th className="px-5 py-3 text-[10px] uppercase font-black tracking-widest text-ink-muted">Shift</th>
                <th className="px-5 py-3 text-[10px] uppercase font-black tracking-widest text-ink-muted text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {profile?.consumption_breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-ink/5 transition-colors">
                  <td className="px-5 py-4 text-sm font-bold text-ink-strong">{row.date}</td>
                  <td className="px-5 py-4 text-sm text-ink">{row.shift}</td>
                  <td className="px-5 py-4 text-sm text-right font-mono font-bold">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── ACTION CARD ── */}
        <div className="bg-surface rounded-lg border border-brand/20 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-brand mb-4">
            <CheckCircle2 size={14} /> Formal Invoice Generation
          </div>
          <p className="text-xs text-ink-muted leading-relaxed mb-6 font-medium">
            Generate and send a professional WhatsApp invoice to the customer for the current billing cycle.
          </p>
          <button
            onClick={() => shareMutation.mutate()}
            disabled={!profile || shareMutation.isPending}
            className="w-full bg-brand text-white px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2"
          >
            <Send size={16} /> Generate & Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}