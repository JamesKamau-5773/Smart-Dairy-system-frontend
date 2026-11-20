import { Download, Loader2, Share2, ShieldCheck } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import BrandLogo from '../brand/BrandLogo';
import { formatMoney, formatReceiptDate } from '../../lib/receipt';
import { financeCopy } from '../../i18n/finance';
import { humanizeEnum } from '../../lib/enumLabel';

// The backend's receipt statuses (ReceiptStatus: ISSUED, then VOIDED after a correction).
// Anything else it adds later shows humanised, in neutral colours.
const STATUS_TONE = {
  ISSUED: 'border-success/25 bg-success/10 text-success',
  VOIDED: 'border-danger/25 bg-danger-50 text-danger',
};
const NEUTRAL_TONE = 'border-ink/15 bg-ink-50 text-ink-muted';

function DetailRow({ label, children, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-meta text-ink-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-body-strong text-ink ${mono ? 'break-all tabular-nums' : ''}`}>{children}</dd>
    </div>
  );
}

function ActionLabel({ busy, icon: Icon, busyLabel, label }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
      {busy ? busyLabel : label}
    </span>
  );
}

/**
 * The receipt as a document: brand and number on top, the amount it confirms, who issued it and
 * who paid, then the payment details. Every value is the backend's receipt as sent; a missing one
 * reads "Not recorded".
 */
export default function ReceiptPreview({ receipt, isOpen, onClose, onDownload, onShare, isDownloading, isSharing = false }) {
  if (!isOpen || !receipt) return null;
  const copy = financeCopy.receipt;
  const status = String(receipt.status ?? '').toUpperCase();
  const isVoided = status === 'VOIDED';
  const issuer = receipt.tenant?.name || receipt.farm?.name || copy.farmReceipt;
  // The farm's name under the account's, unless they are the same.
  const issuerFarm = receipt.tenant?.name && receipt.farm?.name !== receipt.tenant.name ? receipt.farm?.name : null;

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
            className="flex-1 rounded-button bg-brand px-4 py-2.5 text-control text-white transition-colors hover:bg-brand-dark disabled:opacity-70"
          >
            <ActionLabel busy={isDownloading} icon={Download} busyLabel={copy.preparing} label={copy.download} />
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={isSharing}
            className="flex-1 rounded-button border border-ink/15 bg-white px-4 py-2.5 text-control text-ink transition-colors hover:bg-ink-50 disabled:opacity-70"
          >
            <ActionLabel busy={isSharing} icon={Share2} busyLabel={copy.preparing} label={copy.share} />
          </button>
        </>
      )}
    >
      <article aria-label={copy.title} className="overflow-hidden rounded-card border border-ink/10 border-t-4 border-t-brand bg-white">
        {/* Brand and number: the same top row the PDF carries (BR-031). */}
        <header className="flex items-center justify-between gap-4 px-5 pb-4 pt-5">
          <BrandLogo variant="horizontal" size={36} />
          <div className="min-w-0 text-right">
            <p className="text-label text-ink-muted">{copy.receiptNumber}</p>
            <p className="mt-0.5 break-all text-body-strong tabular-nums text-ink">{receipt.receipt_number || copy.notRecorded}</p>
          </div>
        </header>

        {/* The amount the receipt confirms. */}
        <section className="mx-5 rounded-card bg-ink-50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-label text-ink-muted">{copy.totalReceived}</p>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-badge ${STATUS_TONE[status] ?? NEUTRAL_TONE}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {copy.statuses[status] ?? humanizeEnum(receipt.status)}
            </span>
          </div>
          <p className={`mt-1 text-money-value-primary text-ink ${isVoided ? 'line-through decoration-danger/60' : ''}`}>
            {formatMoney(receipt.amount)}
          </p>
          <p className="mt-1 text-meta text-ink-muted">{copy.issuedOn(formatReceiptDate(receipt.issued_at))}</p>
        </section>

        {/* Parties. */}
        <section className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-label text-ink-muted">{copy.issuedBy}</p>
            <p className="mt-1 break-words text-body-strong text-ink">{issuer}</p>
            {issuerFarm && <p className="break-words text-meta text-ink-muted">{issuerFarm}</p>}
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="text-label text-ink-muted">{copy.receivedFrom}</p>
            <p className="mt-1 break-words text-body-strong text-ink">{receipt.counterparty_name || copy.notRecorded}</p>
          </div>
        </section>

        {/* Payment details, one per row. */}
        <section className="border-t border-dashed border-ink/15 px-5 pb-3 pt-4">
          <h4 className="text-label text-brand">{copy.paymentDetails}</h4>
          <dl className="mt-1 divide-y divide-ink/5">
            <DetailRow label={copy.category}>{receipt.category || copy.notRecorded}</DetailRow>
            <DetailRow label={copy.method}>{receipt.payment_method || copy.notRecorded}</DetailRow>
            <DetailRow label={copy.reference} mono={Boolean(receipt.payment_reference)}>{receipt.payment_reference || copy.notRecorded}</DetailRow>
            <DetailRow label={copy.transactionDate}>{formatReceiptDate(receipt.transaction_date)}</DetailRow>
            <DetailRow label={copy.description}>{receipt.description || copy.paymentReceived}</DetailRow>
          </dl>
        </section>

        {receipt.document_sha256 && (
          <details className="group border-t border-ink/10 bg-ink-50 px-5 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-control text-ink-muted hover:text-ink">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              {copy.verification}
            </summary>
            <p className="mt-2 text-meta text-ink-muted">{copy.verificationHint}</p>
            <p className="mt-1 break-all text-meta text-ink">SHA-256: {receipt.document_sha256}</p>
          </details>
        )}
      </article>
    </BaseModal>
  );
}
