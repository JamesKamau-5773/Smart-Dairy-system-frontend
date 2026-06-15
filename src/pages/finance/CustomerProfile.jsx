import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ReceiptText, Wallet, Droplets, CalendarDays, Phone, CheckCircle2, Clock3 } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import apiClient from '../../lib/apiClient';
import { buildWhatsAppInvoiceMessage, formatMoney } from '../../lib/billing';
import { Skeleton } from '../../components/ui';

function openWhatsApp(phoneNumber, message) {
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function CustomerProfile() {
  const { buyerId } = useParams();
  const navigate = useNavigate();
  const { tenantId, farmId } = useTenant();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['finance-buyer-profile', tenantId, farmId, buyerId],
    queryFn: () => apiClient.get(`/finance/buyers/${buyerId}`).then((res) => res.data),
    enabled: !!buyerId && !!farmId,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const message = buildWhatsAppInvoiceMessage(profile);
      openWhatsApp(profile.buyer.whatsapp, message);
      return message;
    },
  });

  const paymentRows = profile?.payment_history || [];
  const breakdownRows = profile?.consumption_breakdown || [];

  const totals = useMemo(() => {
    if (!profile) return null;
    return [
      { label: 'Owed', value: profile.summary.invoice_total, icon: ReceiptText, tone: 'text-brand' },
      { label: 'Paid', value: profile.summary.payments_received, icon: Wallet, tone: 'text-accent-dark' },
      { label: 'Balance', value: profile.summary.outstanding_balance, icon: MessageSquare, tone: profile.summary.outstanding_balance > 0 ? 'text-danger' : 'text-brand' },
      { label: 'Liters', value: `${profile.summary.liters_delivered} L`, icon: Droplets, tone: 'text-ink' },
    ];
  }, [profile]);

  return (
    <div className="animate-reveal space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/finance/buyers')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline mb-3"
          >
            <ArrowLeft size={16} /> Back to customers
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <CalendarDays size={12} /> Customer Billing Dashboard
          </div>
          <h2 className="font-sans font-bold text-3xl tracking-tight text-brand m-0">
            {profile?.buyer.name || 'Customer'} <span className="text-ink-muted">Profile</span>
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-2">Financial overview, payment history, and proof of delivery by shift.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {profile && (
            <div className="px-4 py-3 rounded-xl bg-surface border border-ink/10 text-ink-strong">
              <div className="text-[10px] uppercase font-bold text-ink-muted">Contact</div>
              <div className="font-bold text-ink-strong flex items-center gap-2"><Phone size={14} /> {profile.buyer.contact}</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => shareMutation.mutate()}
            disabled={!profile || shareMutation.isPending}
            className="btn-command bg-brand text-surface inline-flex items-center gap-2"
          >
            <MessageSquare size={16} /> {shareMutation.isPending ? 'Opening WhatsApp...' : 'Generate & Share Bill'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="card-machined p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-3/5" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="card-machined p-6 space-y-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="card-machined p-6 space-y-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="card-machined p-6 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="card-machined p-6 bg-danger/5 border border-danger/20 text-danger font-medium">
          We could not load this customer profile.
        </div>
      )}

      {profile && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {totals.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="card-machined p-6 bg-surface text-ink-strong">
                  <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider text-ink-muted">
                    <span>{card.label}</span>
                    <Icon size={16} className={card.tone} />
                  </div>
                  <div className={`mt-4 text-3xl font-black tracking-tight ${card.tone}`}>
                    {typeof card.value === 'number' ? formatMoney(card.value) : card.value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="card-machined p-0 overflow-hidden bg-surface text-ink-strong">
              <div className="p-6 border-b border-ink/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-brand text-lg flex items-center gap-2"><Clock3 size={18} /> Consumption Breakdown</h3>
                  <p className="text-xs text-ink-muted mt-1">AM and PM deliveries rolled up into a transparent ledger.</p>
                </div>
                <div className="text-xs font-bold uppercase text-ink-muted">Rate: KSh {profile.buyer.rate_per_liter}/L</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-warm text-ink-muted">
                    <tr>
                      <th className="p-4 text-[10px] uppercase tracking-wider">Date</th>
                      <th className="p-4 text-[10px] uppercase tracking-wider">Shift</th>
                      <th className="p-4 text-[10px] uppercase tracking-wider text-right">Liters</th>
                      <th className="p-4 text-[10px] uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {breakdownRows.map((row) => (
                      <tr key={`${row.date}-${row.shift}`} className="hover:bg-surface-warm/40 transition-colors">
                        <td className="p-4 text-sm text-ink">{row.date}</td>
                        <td className="p-4 text-sm font-semibold text-brand">{row.shift}</td>
                        <td className="p-4 text-sm text-right tabular-nums">{row.liters}</td>
                        <td className="p-4 text-sm text-right tabular-nums font-semibold">{formatMoney(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
                <div className="card-machined p-6 bg-surface h-full text-ink-strong">
                <h3 className="font-bold text-brand text-lg flex items-center gap-2 mb-4"><Wallet size={18} /> Statement of Account</h3>
                <div className="space-y-3">
                  {paymentRows.map((payment) => (
                      <div key={payment.id} className="rounded-lg border border-ink/5 bg-surface-warm p-4 flex items-start justify-between gap-3 text-ink-strong">
                      <div>
                        <div className="font-bold text-ink-strong">{payment.method}</div>
                        <div className="text-xs text-ink-muted mt-1">{payment.date} • {payment.note}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-brand tabular-nums">{formatMoney(payment.amount)}</div>
                        <div className="text-[10px] uppercase text-ink-muted tracking-wider">Paid</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-machined p-6 bg-brand text-white">
                <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-white/80">
                  <CheckCircle2 size={12} /> Share-ready invoice
                </div>
                <p className="mt-3 text-sm leading-6 opacity-90">
                  Generate a clean WhatsApp message that includes the shift-by-shift consumption breakdown and the running balance.
                </p>
                <p className="mt-3 text-sm font-bold">Customer: {profile.buyer.name}</p>
                <p className="text-sm opacity-80">Billing cycle: {profile.buyer.billing_cycle}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
