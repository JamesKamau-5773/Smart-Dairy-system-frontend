import { useNavigate } from 'react-router-dom';
import PeriodChart from '../periods/PeriodChart';
import Money, { formatMoneyText } from '../ui/Money';
import { ListLoadMessage } from '../ui/ListLoadState';
import { SURFACE } from '../data/surface';
import { useMoneyFlowSeries } from '../../hooks/useMoneyFlowSeries';
import { bucketRange, TRAILING_DAYS } from '../../lib/chartWindow';
import { formatDate, formatDateRange, formatMonth } from '../../lib/dateFormat';

const SERIES = [
  { id: 'income', label: 'Money in', barClass: 'bg-brand' },
  { id: 'expenses', label: 'Money out', barClass: 'bg-ink-500' },
];

const bucketLabel = (granularity, key) => (granularity === 'day' ? formatDate(key) : formatMonth(key));
const axisLabel = (granularity, key) => (granularity === 'day' ? String(Number(key.slice(8))) : formatMonth(key, { withYear: false }));

function caption(span) {
  if (span.trailing) return `Last ${TRAILING_DAYS} days to ${formatDate(span.to)}, by day`;
  return `${formatDateRange(span.from, span.to)}, by ${span.granularity}`;
}

const moneyCell = (amount, props) => (amount == null ? '—' : <Money amount={amount} size="sm" {...props} />);

/**
 * Money in and out for the Farm Reporting Dashboard's range, a bar per day (up to a month)
 * or per month. Follows the dashboard's filters only; a bar opens the Ledger on its dates.
 * Every figure comes from the API (useMoneyFlowSeries); the text table below the chart
 * gives the same figures to screen readers and keyboard users.
 */
export default function MoneyFlowChart({ start, end, search, customerSelected = false }) {
  const navigate = useNavigate();
  const series = useMoneyFlowSeries({ start, end, search, enabled: !customerSelected });
  const { span } = series;
  if (!span) return null;

  const items = series.items.map(({ key, totals }) => ({
    key,
    label: bucketLabel(span.granularity, key),
    income: totals?.income ?? null,
    expenses: totals?.expenses ?? null,
    net: totals?.net ?? null,
    count: totals?.count ?? null,
    hasTotals: Boolean(totals),
  }));
  const openLedger = (key) => {
    const { from, to } = bucketRange(span, key);
    navigate(`/finance/ledger?from=${from}&to=${to}`);
  };

  let body;
  if (customerSelected) {
    // TODO(BR-023): show the chart for the chosen customers once group totals accept them.
    body = <p className="text-sm text-ink-muted">This chart can’t be narrowed to customers yet. Clear the customer filter to see money in and out.</p>;
  } else if (series.loadState === 'loading') {
    body = <div aria-busy="true" className="h-36 animate-pulse rounded-input bg-ink/5" />;
  } else if (series.loadState === 'error' || series.loadState === 'offline') {
    body = <ListLoadMessage state={series.loadState} label="money in and out" error={series.error} onRetry={series.refetch} />;
  } else {
    body = (
      <>
        <PeriodChart
          label={`Money in and out, ${caption(span)}`}
          items={items}
          series={SERIES}
          describe={(item) => `${item.label} · In ${formatMoneyText(item.income)} · Out ${formatMoneyText(item.expenses)} · open in Ledger`}
          isEmpty={(item) => !item.hasTotals || item.count === 0}
          axisLabel={(item) => axisLabel(span.granularity, item.key)}
          onSelect={openLedger}
        />
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-brand sm:min-h-0">Show as a table</summary>
          <table className="mt-2 w-full table-fixed border-collapse text-left">
            <caption className="sr-only">Money in and out, {caption(span)}</caption>
            <thead>
              <tr className="border-b border-ink/10 text-[10px] uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-1.5 pr-2 font-semibold">{span.granularity === 'day' ? 'Day' : 'Month'}</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Money in</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Money out</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} className="border-b border-ink/5">
                  <th scope="row" className="py-1.5 pr-2 font-normal text-ink">{item.label}</th>
                  <td className="py-1.5 pr-2 text-right">{moneyCell(item.income)}</td>
                  <td className="py-1.5 pr-2 text-right">{moneyCell(item.expenses)}</td>
                  <td className="py-1.5 text-right">{moneyCell(item.net, { tone: 'net' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </>
    );
  }

  return (
    <section aria-label="Money in and out" className={`${SURFACE} space-y-3 p-4 sm:p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-ink">Money in and out</h3>
        <p className="text-xs text-ink-muted">{caption(span)}</p>
      </div>
      {body}
    </section>
  );
}
