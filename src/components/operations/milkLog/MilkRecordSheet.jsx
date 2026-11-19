import { Link } from 'react-router-dom';
import BottomSheet from '../../ui/BottomSheet';
import VsAverageText from './VsAverageText';

/**
 * A milk record's details as a bottom sheet (phones): who, when, the yield against the cow's
 * average, the details list and the record's actions. Focus stays inside while open; Escape,
 * the backdrop or ✕ close it, and focus goes back to the row that opened it.
 * Presentational: every value and action comes in as props.
 *
 * details: [{ key, label, value, icon? }]
 * primaryAction: { label, onClick }
 * secondaryActions: [{ key, label, onClick } | { key, label, to }]
 * destructiveAction: { label, onClick } | null
 */
export default function MilkRecordSheet({
  open,
  onClose,
  labels,
  title,
  subtitle,
  litres,
  vsAvg,
  significantDrop,
  averageText,
  details,
  primaryAction,
  secondaryActions = [],
  destructiveAction = null,
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      titleClassName="text-section-title text-brand"
      header={<p className="m-0 mt-0.5 text-meta text-ink-500">{subtitle}</p>}
      closeLabel={labels.close}
    >
        <div className="mx-4 mt-4 flex items-end justify-between gap-3 rounded-card border border-ink-200 bg-ink-50 p-4">
          <div className="min-w-0">
            <p className="m-0 text-stat-label text-ink-500">{labels.yield}</p>
            <p className="m-0 mt-1 text-record-figure-lg text-brand">{litres}</p>
          </div>
          <div className="shrink-0 text-right">
            <VsAverageText vsAvg={vsAvg} significantDrop={significantDrop} tone="text-ink-900" className="block text-record-figure" />
            {averageText && <p className="m-0 mt-0.5 text-meta text-ink-500">{averageText}</p>}
          </div>
        </div>

        <dl className="mx-4 mt-2 divide-y divide-ink-100">
          {details.map(({ key, label, value, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-body text-ink-500">{label}</dt>
              <dd className="m-0 flex min-w-0 items-center gap-1.5 text-right text-body text-ink-900">
                {Icon && <Icon size={14} className="shrink-0 text-ink-600" aria-hidden="true" />}
                <span className="truncate">{value}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mx-4 mt-3 space-y-2">
          <button type="button" onClick={primaryAction.onClick} className="btn-command w-full">{primaryAction.label}</button>
          {secondaryActions.map((action) => (action.to ? (
            <Link key={action.key} to={action.to} className="btn-secondary flex w-full items-center justify-center">{action.label}</Link>
          ) : (
            <button key={action.key} type="button" onClick={action.onClick} className="btn-secondary w-full">{action.label}</button>
          )))}
          {destructiveAction && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={destructiveAction.onClick}
                className="inline-flex min-h-11 items-center px-2 text-body text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                {destructiveAction.label}
              </button>
            </div>
          )}
        </div>
    </BottomSheet>
  );
}
