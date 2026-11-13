import { BadgeCheck, CalendarDays, CreditCard, Download, Hash, ReceiptText, Share2, UserRound } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import { formatMoney, formatReceiptDate } from '../../lib/receipt';
import { financeCopy } from '../../i18n/finance';

export default function ReceiptPreview({ receipt, isOpen, onClose, onDownload, onShare, isDownloading }) {
  if (!isOpen || !receipt) return null;
  const copy = financeCopy.receipt;

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={copy.title}
      icon={<ReceiptText size={18} />}
      size="xl"
      closeLabel={copy.close}
      footerActions={(
        <>
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-dark"
          >
            <span className="inline-flex items-center justify-center gap-2"><Download size={16} /> {isDownloading ? copy.preparing : copy.download}</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex-1 rounded-lg border border-ink/10 bg-surface-raised px-4 py-2.5 text-sm font-black text-ink hover:bg-surface"
          >
            <span className="inline-flex items-center justify-center gap-2"><Share2 size={16} /> {copy.share}</span>
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-ink">{receipt.tenant?.name || receipt.farm?.name || copy.farmReceipt}</h3>
            <p className="mt-1 text-sm text-ink-muted">{receipt.farm?.name || copy.farmNotRecorded}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 border border-success/20 bg-success/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-success"><BadgeCheck size={12} /> {receipt.status}</span>
            <p className="mt-3 font-mono text-xs font-bold text-ink">{receipt.receipt_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-y border-ink/10 py-3 text-sm"><div><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">{copy.issued}</p><p className="mt-1 flex items-center gap-1.5 font-bold text-ink"><CalendarDays size={14} /> {formatReceiptDate(receipt.issued_at)}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">{copy.receivedFrom}</p><p className="mt-1 flex items-center gap-1.5 font-bold text-ink"><UserRound size={14} /> {receipt.counterparty_name || copy.notRecorded}</p></div></div>
        <section><h4 className="text-[10px] font-black uppercase tracking-wider text-brand">{copy.paymentDetails}</h4><div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2"><div><p className="text-ink-muted">{copy.category}</p><p className="font-bold text-ink">{receipt.category || copy.notRecorded}</p></div><div><p className="text-ink-muted">{copy.method}</p><p className="flex items-center gap-1.5 font-bold text-ink"><CreditCard size={14} /> {receipt.payment_method || copy.notRecorded}</p></div><div><p className="text-ink-muted">{copy.reference}</p><p className="font-mono font-bold text-ink">{receipt.payment_reference || copy.notRecorded}</p></div><div><p className="text-ink-muted">{copy.transactionDate}</p><p className="font-bold text-ink">{formatReceiptDate(receipt.transaction_date)}</p></div></div></section>
        <section className="border-l-4 border-brand/25 bg-surface-raised px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">{copy.description}</p><p className="mt-1 text-sm text-ink">{receipt.description || copy.paymentReceived}</p></section>
        <div className="flex items-center justify-between border border-success/20 bg-success/10 px-4 py-4"><span className="text-xs font-black uppercase tracking-wider text-success">{copy.totalReceived}</span><span className="text-xl font-black text-ink">{formatMoney(receipt.amount)}</span></div>
        {receipt.document_sha256 && <details className="border-t border-ink/10 pt-3"><summary className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-muted"><Hash size={13} /> {copy.verification}</summary><p className="mt-2 break-all font-mono text-[10px] text-ink-muted">SHA-256: {receipt.document_sha256}</p></details>}
      </div>
    </BaseModal>
  );
}
