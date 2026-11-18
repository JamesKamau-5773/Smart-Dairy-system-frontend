// The dashboard's stat cards, in display order. The order here is the order on every screen
// size (phones read it top to bottom): the most important card first, the next most important
// last, the rest in between.
//
// Each card: `labelKey` / `unitKey` name dashboardCopy.summary strings; `select` picks the
// backend figure from useDailySummary().figures; `format` turns it into text; `signed` cards
// show a negative figure in the danger tone (with its minus sign, so colour is not the only cue).
import { formatCount, formatKES, formatLitres } from '../../lib/numberFormat';

const litres = (value) => formatLitres(value, { unit: false });
const shillings = (value) => formatKES(value);

/** Money, one region: Daily profit leads (the one primary card), feed cost (the cost the farmer controls) ends. */
export const MONEY_CARDS = [
  { id: 'profit', labelKey: 'profit', select: (f) => f.profit, format: shillings, variant: 'primary', signed: true },
  {
    id: 'revenue',
    labelKey: 'revenue',
    select: (f) => f.revenue,
    format: shillings,
    variant: 'secondary',
    // The revenue the daily report counts, for comparison; shown behind the info button.
    tooltip: (f, copy) => (f.reportRevenue === null ? null : copy.reportReference(formatKES(f.reportRevenue))),
    tooltipLabelKey: 'revenueInfo',
  },
  { id: 'feedCost', labelKey: 'feedCost', select: (f) => f.feedCost, format: shillings, variant: 'secondary' },
];

/** Milk, one flat grid: Total milk first, Milk remaining (what is still left to sell) last. */
export const MILK_CARDS = [
  { id: 'totalMilk', labelKey: 'totalMilk', unitKey: 'liters', select: (f) => f.totalLiters, format: litres },
  { id: 'saleableMilk', labelKey: 'saleableMilk', unitKey: 'liters', select: (f) => f.saleableLiters, format: litres },
  { id: 'milkSold', labelKey: 'milkSold', unitKey: 'liters', select: (f) => f.soldLiters, format: litres },
  { id: 'cowsMilked', labelKey: 'cowsMilked', unitKey: 'cows', select: (f) => f.cowsMilked, format: formatCount },
  { id: 'averagePerCow', labelKey: 'averagePerCow', unitKey: 'perCow', select: (f) => f.averagePerCow, format: litres },
  {
    id: 'profitPerLiter',
    labelKey: 'profitPerLiter',
    select: (f) => f.profitPerLiter,
    format: (value, f) => formatKES(value, { fractionDigits: 2, currency: f.currency ?? 'KES' }),
    signed: true,
  },
  { id: 'milkRemaining', labelKey: 'milkRemaining', unitKey: 'liters', select: (f) => f.remainingLiters, format: litres, signed: true },
];

/**
 * What one card shows: { label, value, unit, tone, tooltip, tooltipLabel }. `value` is null when
 * the backend sent no figure (the card shows a muted "—"); otherwise it is the backend's figure
 * as returned, formatted, and negative figures on signed cards take the danger tone.
 */
export function statCardProps(card, figures, { copy }) {
  const raw = card.select(figures);
  return {
    label: copy[card.labelKey],
    value: raw === null || raw === undefined ? null : card.format(raw, figures),
    unit: card.unitKey ? copy[card.unitKey] : undefined,
    tone: card.signed && raw !== null && raw < 0 ? 'danger' : 'default',
    tooltip: card.tooltip?.(figures, copy) ?? undefined,
    tooltipLabel: card.tooltipLabelKey ? copy[card.tooltipLabelKey] : undefined,
  };
}
