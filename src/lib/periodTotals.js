// Adapters for the period totals contract (docs/contracts/period-totals.md).
// They map API DTOs to view models and do nothing else: every total, average, bucket
// and percentage comes from the backend. Components never read raw API shapes.

// A date range chosen in a page's filters.
export const CUSTOM_PERIOD = 'custom';
export const GROUP_LEVELS = Object.freeze(['year', 'month', 'week', 'day']);
// The levels the Production Log and Ledger tables group by (no weeks).
export const TABLE_GROUP_LEVELS = Object.freeze(['year', 'month', 'day']);

const MINOR_UNITS = /^(-?)(\d+)$/;

/**
 * "2700500" (cents) → 27005 for <Money>. Done by moving the decimal point in the
 * string, so no float division can change a digit. Null when unreadable.
 */
export function minorUnitsToAmount(value) {
  if (value === null || value === undefined) return null;
  const match = MINOR_UNITS.exec(String(value).trim());
  if (!match) return null;
  const [, sign, digits] = match;
  const padded = digits.padStart(3, '0');
  return Number(`${sign}${padded.slice(0, -2)}.${padded.slice(-2)}`);
}

/** Direction of a signed decimal string from the API ("-5.3" → 'down'). */
export function changeDirection(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  if (/^-?0+(\.0+)?$/.test(text)) return 'flat';
  return text.startsWith('-') ? 'down' : 'up';
}

const countOrNull = (value) => (Number.isInteger(value) ? value : null);

function toChange(abs, pct, previousLabel) {
  if (abs == null && pct == null) return null;
  return { abs, pct: pct ?? null, direction: changeDirection(pct ?? null), vsLabel: previousLabel ?? null };
}

function toSummaryFrame(dto) {
  return {
    period: dto.period ?? null,
    key: dto.key ?? null,
    label: dto.label ?? null,
    range: dto.range?.from && dto.range?.to ? { from: dto.range.from, to: dto.range.to } : null,
    hasNext: dto.has_next === true,
  };
}

const toLedgerMetrics = (source = {}) => ({
  income: minorUnitsToAmount(source.income),
  expenses: minorUnitsToAmount(source.expenses),
  net: minorUnitsToAmount(source.net),
  unpaid: minorUnitsToAmount(source.unpaid),
  count: countOrNull(source.count),
});

// Fields the contract doesn't have yet stay `undefined` (not null), so the page can
// leave out a metric the API doesn't send instead of showing a made-up value.
const optional = (source, key) => (Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined);

const toProductionMetrics = (source = {}) => ({
  litres: source.litres ?? null,
  entries: countOrNull(source.entries),
  milkingDays: countOrNull(source.milking_days),
  avgLitresPerDay: source.avg_litres_per_day ?? null,
  avgLitresPerCowDay: source.avg_litres_per_cow_day ?? null,
  count: countOrNull(source.entries),
  // Requested from the backend (docs/contracts/period-totals.md, open questions).
  fedToCalvesLitres: optional(source, 'fed_to_calves_litres'),
  availableLitres: optional(source, 'available_litres'),
  lastEntryDate: optional(source, 'last_entry_date'),
});

const metricChange = (change, key, previousLabel) => {
  const pct = change ? optional(change, key) : undefined;
  return pct === undefined ? undefined : toChange(null, pct, previousLabel);
};

export function toLedgerSummary(dto) {
  if (!dto || typeof dto !== 'object') return null;
  return {
    ...toSummaryFrame(dto),
    current: toLedgerMetrics(dto.current),
    previous: dto.previous ? { key: dto.previous.key ?? null, label: dto.previous.label ?? null, ...toLedgerMetrics(dto.previous) } : null,
    change: dto.change ? toChange(minorUnitsToAmount(dto.change.net_abs), dto.change.net_pct, dto.previous?.label) : null,
    breakdown: Array.isArray(dto.breakdown) ? dto.breakdown.map((item) => ({
      key: item.key,
      label: item.label,
      // Axis label ("Mar"); requested from the backend, the full label until it's sent.
      shortLabel: item.short_label ?? null,
      // The bar shows net; the value is a display magnitude only.
      value: minorUnitsToAmount(item.net),
      income: minorUnitsToAmount(item.income),
      expenses: minorUnitsToAmount(item.expenses),
      net: minorUnitsToAmount(item.net),
      // Requested from the backend so an empty sub-period is told apart from KES 0 in/out.
      count: optional(item, 'count') === undefined ? undefined : countOrNull(item.count),
    })) : [],
  };
}

export function toProductionSummary(dto) {
  if (!dto || typeof dto !== 'object') return null;
  return {
    ...toSummaryFrame(dto),
    current: toProductionMetrics(dto.current),
    previous: dto.previous ? { key: dto.previous.key ?? null, label: dto.previous.label ?? null, ...toProductionMetrics(dto.previous) } : null,
    change: dto.change ? toChange(dto.change.litres_abs ?? null, dto.change.litres_pct, dto.previous?.label) : null,
    // Per-metric changes beyond litres are requested from the backend; undefined until sent.
    metricChanges: {
      avgLitresPerDay: metricChange(dto.change, 'avg_litres_per_day_pct', dto.previous?.label),
      entries: metricChange(dto.change, 'entries_pct', dto.previous?.label),
      fedToCalvesLitres: metricChange(dto.change, 'fed_to_calves_pct', dto.previous?.label),
      availableLitres: metricChange(dto.change, 'available_pct', dto.previous?.label),
    },
    breakdown: Array.isArray(dto.breakdown) ? dto.breakdown.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.litres == null ? null : Number(item.litres),
      litres: item.litres ?? null,
    })) : [],
  };
}

function toGroupIndex(dto, toMetrics) {
  const groups = Array.isArray(dto?.groups) ? dto.groups : [];
  const byKey = new Map();
  groups.forEach((group) => {
    if (!group?.key || !GROUP_LEVELS.includes(group.level)) return;
    byKey.set(group.key, {
      level: group.level,
      key: group.key,
      parent: group.parent ?? null,
      label: group.label ?? null,
      totals: toMetrics(group),
    });
  });
  return byKey;
}

export const toLedgerGroupTotals = (dto) => toGroupIndex(dto, (group) => ({
  count: countOrNull(group.count),
  income: minorUnitsToAmount(group.income),
  expenses: minorUnitsToAmount(group.expenses),
  net: minorUnitsToAmount(group.net),
}));

export const toProductionGroupTotals = (dto) => toGroupIndex(dto, (group) => ({
  count: countOrNull(group.entries ?? group.count),
  litres: group.litres ?? null,
  entries: countOrNull(group.entries),
  avgLitresPerDay: group.avg_litres_per_day ?? null,
}));

/** Drops empty filter values so the query key and request stay stable. */
export function toTotalsParams(filters = {}) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => (
    value !== undefined && value !== null && value !== '' && value !== 'all'
  )));
}

/**
 * The range the Production Log and the Ledger open on, for the table and the summary strip
 * alike: the current month up to today. (Totals for "all dates" need BR-021.)
 * `today` is YYYY-MM-DD; only the text is used, no date maths.
 */
export function currentMonthRange(today) {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** Summary params for the table's date range (`period=custom`). */
export function summaryScopeParams(range) {
  return { period: CUSTOM_PERIOD, date_from: range.from, date_to: range.to };
}
