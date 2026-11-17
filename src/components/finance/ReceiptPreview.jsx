import BaseModal from '../ui/BaseModal';
import { formatMoney, formatReceiptDate } from '../../lib/receipt';
import { financeCopy } from '../../i18n/finance';
import { humanizeEnum } from '../../lib/enumLabel';

export default function ReceiptPreview({ receipt, isOpen, onClose, onDownload, onShare, isDownloading }) {
  if (!isOpen || !receipt) return null;
  const copy = financeCopy.receipt;

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={copy.title}
      size="xl"
      closeLabel={copy.close}
      footerActions={(
        <>
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-control text-white hover:bg-brand-dark"
          >
            <span className="inline-flex items-center justify-center">{isDownloading ? copy.preparing : copy.download}</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex-1 rounded-lg border border-ink/10 bg-surface-raised px-4 py-2.5 text-control text-ink hover:bg-surface"
          >
            <span className="inline-flex items-center justify-center">
          {copy.share}</span>
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-section-title text-ink">{receipt.tenant?.name || receipt.farm?.name || copy.farmReceipt}</h3>
            <p className="mt-1 text-body text-ink-muted">{receipt.farm?.name || copy.farmNotRecorded}</p>
          </div>
          <div className="text-right">
            {/* TODO(BR-024): en/sw strings once the contract lists the receipt statuses; humanised until then. */}
            <span className="inline-flex items-center border border-success/20 bg-success/10 px-2 py-1 text-badge text-success">{humanizeEnum(receipt.status)}</span>
            <p className="mt-3 text-meta tabular-nums text-ink">{receipt.receipt_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-y border-ink/10 py-3 text-body">
          <div><p className="text-label text-ink-muted">{copy.issued}</p><p className="mt-1 text-body-strong text-ink">{formatReceiptDate(receipt.issued_at)}</p></div>
          <div><p className="text-label text-ink-muted">{copy.receivedFrom}</p><p className="mt-1 text-body-strong text-ink">{receipt.counterparty_name || copy.notRecorded}</p></div>
        </div>
        <section>
          <h4 className="text-label text-brand">{copy.paymentDetails}</h4>
          <div className="mt-2 grid grid-cols-1 gap-2 text-body sm:grid-cols-2">
            <div><p className="text-meta text-ink-muted">{copy.category}</p><p className="text-body-strong text-ink">{receipt.category || copy.notRecorded}</p></div>
            <div><p className="text-meta text-ink-muted">{copy.method}</p><p className="text-body-strong text-ink">{receipt.payment_method || copy.notRecorded}</p></div>
            <div><p className="text-meta text-ink-muted">{copy.reference}</p><p className="text-body-strong text-ink">{receipt.payment_reference || copy.notRecorded}</p></div>
            <div><p className="text-meta text-ink-muted">{copy.transactionDate}</p><p className="text-body-strong text-ink">{formatReceiptDate(receipt.transaction_date)}</p></div>
          </div>
        </section>
        <section className="border-l-4 border-brand/25 bg-surface-raised px-3 py-2">
          <p className="text-label text-ink-muted">{copy.description}</p>
          <p className="mt-1 text-body text-ink">{receipt.description || copy.paymentReceived}</p>
        </section>
        <div className="flex items-center justify-between border border-success/20 bg-success/10 px-4 py-4">
          <span className="text-label text-success">{copy.totalReceived}</span>
          <span className="text-stat-value text-ink">{formatMoney(receipt.amount)}</span>
        </div>
        {receipt.document_sha256 && (
          <details className="border-t border-ink/10 pt-3">
            <summary className="cursor-pointer text-control text-ink-muted">{copy.verification}</summary>
            <p className="mt-2 break-all text-meta text-ink-muted">SHA-256: {receipt.document_sha256}</p>
          </details>
        )}
      </div>
    </BaseModal>
  );
}
