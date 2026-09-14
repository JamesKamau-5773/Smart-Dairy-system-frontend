import { BadgeCheck, CalendarDays, CreditCard, Download, Hash, ReceiptText, Share2, UserRound, X } from 'lucide-react';
import { formatMoney, formatReceiptDate } from '../../lib/receipt';

export default function ReceiptPreview({ receipt, isOpen, onClose, onDownload, onShare, isDownloading }) {
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-reveal-fast">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-ink/10 bg-white shadow-2xl">
        <div className="border-b-4 border-brand px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-brand"><ReceiptText size={18} /><p className="text-[10px] font-black uppercase tracking-[0.18em]">Payment receipt</p></div>
              <h3 className="mt-2 text-xl font-black text-ink">{receipt.tenant?.name || receipt.farm?.name || 'Farm receipt'}</h3>
              <p className="mt-1 text-sm text-ink-muted">{receipt.farm?.name || 'Farm not recorded'}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 border border-success/20 bg-success/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-success"><BadgeCheck size={12} /> {receipt.status}</span>
              <p className="mt-3 font-mono text-xs font-bold text-ink">{receipt.receipt_number}</p>
            </div>
          </div>
          <button type="button" aria-label="Close receipt preview" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 text-ink-muted">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 border-y border-ink/10 py-3 text-sm"><div><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">Issued</p><p className="mt-1 flex items-center gap-1.5 font-bold text-ink"><CalendarDays size={14} /> {formatReceiptDate(receipt.issued_at)}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">Received from</p><p className="mt-1 flex items-center gap-1.5 font-bold text-ink"><UserRound size={14} /> {receipt.counterparty_name || 'Not recorded'}</p></div></div>
          <section><h4 className="text-[10px] font-black uppercase tracking-wider text-brand">Payment details</h4><div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2"><div><p className="text-ink-muted">Category</p><p className="font-bold text-ink">{receipt.category || 'Not recorded'}</p></div><div><p className="text-ink-muted">Method</p><p className="flex items-center gap-1.5 font-bold text-ink"><CreditCard size={14} /> {receipt.payment_method || 'Not recorded'}</p></div><div><p className="text-ink-muted">Reference</p><p className="font-mono font-bold text-ink">{receipt.payment_reference || 'Not recorded'}</p></div><div><p className="text-ink-muted">Transaction date</p><p className="font-bold text-ink">{formatReceiptDate(receipt.transaction_date)}</p></div></div></section>
          <section className="border-l-4 border-brand/25 bg-surface-raised px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">Description</p><p className="mt-1 text-sm text-ink">{receipt.description || 'Payment received'}</p></section>
          <div className="flex items-center justify-between border border-success/20 bg-success/10 px-4 py-4"><span className="text-xs font-black uppercase tracking-wider text-success">Total received</span><span className="text-xl font-black text-ink">{formatMoney(receipt.amount)}</span></div>
          {receipt.document_sha256 && <details className="border-t border-ink/10 pt-3"><summary className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-muted"><Hash size={13} /> Verification details</summary><p className="mt-2 break-all font-mono text-[10px] text-ink-muted">SHA-256: {receipt.document_sha256}</p></details>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-dark"
            >
              <span className="inline-flex items-center justify-center gap-2"><Download size={16} /> {isDownloading ? 'Preparing...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex-1 rounded-lg border border-ink/10 bg-surface-raised px-4 py-2.5 text-sm font-black text-ink hover:bg-surface"
            >
              <span className="inline-flex items-center justify-center gap-2"><Share2 size={16} /> Share receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
