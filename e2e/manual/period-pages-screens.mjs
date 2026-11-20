// Screenshots of the Ledger and the Production Log at 1280px and 390px, for UI audits.
// The API is answered in the browser by the fixtures below, which aggregate their own
// records the way the backend does, so before/after shots show the same figures.
//
//   npm run build -- --mode development   (or a normal build with VITE_API_BASE_URL set)
//   VITE_API_BASE_URL=http://api.e2e.test npm run build && npx vite preview --port 4173 &
//   node e2e/manual/period-pages-screens.mjs before   # or: after
//
// Output: docs/audit/screens/<label>-<page>-<width>.png (or SCREENS_OUT_DIR)
// Pages: SCREENS_PAGES=register,home,ledger,production-log,reports,inventory,record-milk,herd,breeding,medical,milk-drops,animal,milk-history
//   milk-usage,routine,tasks,feeding,feed-planner,feed-mixes,milk-lab,units,
//   buyers,customers,customer-profile,customer-value,cow-profit,milk-inventory,safety,staff,payroll,
//   login,not-found,ledger-entry,ledger-filters,production-log-filters,milk-usage-filters,
//   herd-filters,breeding-history,medical-filters,milk-history-filters,safety-filters,ledger-sheet,
//   inventory-filters,buyers-filters,customers-filters,reports-filters,staff-filters
//   (default: ledger,production-log,reports)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const LABEL = process.argv[2] ?? 'after';
const BASE_URL = process.env.SCREENS_BASE_URL ?? 'http://localhost:4173';
const API_ORIGIN = 'http://api.e2e.test';
const OUT_DIR = process.env.SCREENS_OUT_DIR ?? 'docs/audit/screens';
// 'register' is shot before signing in; 'home' is wherever registering lands.
const ROUTES = { register: '/register', home: null, ledger: '/finance/ledger', 'production-log': '/operations/yield', reports: '/operations/reports?period=custom&start_date=2026-09-01&end_date=2026-11-16', inventory: '/operations/inventory', 'record-milk': '/operations/yield',
  herd: '/operations/herd', breeding: '/operations/breeding', medical: '/operations/records', 'milk-drops': '/operations/milk-drop-reports',
  animal: '/operations/animal/1', 'milk-history': '/operations/animal/1/milk-history',
  'milk-usage': '/operations/milk-usage', routine: '/operations/routine', tasks: '/tasks', feeding: '/feeding', 'feed-planner': '/feed-nutrition',
  'feed-mixes': '/feed-nutrition/mix', 'milk-lab': '/operations/lab', units: '/operations/unit-conversions',
  buyers: '/finance/buyers', customers: '/operations/customers', 'customer-profile': '/finance/customers/4',
  'customer-value': '/finance/reports/dairy-unit-economics', 'cow-profit': '/finance/reports/animal-economics', 'milk-inventory': '/operations/reports/milk-inventory',
  safety: '/operations/safety', staff: '/hr/staff', payroll: '/hr/payroll',
  login: '/login', 'not-found': '/no-such-page', 'ledger-entry': '/finance/ledger', 'ledger-filters': '/finance/ledger',
  'production-log-filters': '/operations/yield?session=Morning', 'milk-usage-filters': '/operations/milk-usage',
  'herd-filters': '/operations/herd?status=Milking', 'breeding-history': '/operations/breeding', 'medical-filters': '/operations/records',
  'milk-history-filters': '/operations/animal/1/milk-history', 'safety-filters': '/operations/safety',
  'ledger-sheet': '/finance/ledger',
  'inventory-filters': '/operations/inventory', 'buyers-filters': '/finance/buyers', 'customers-filters': '/operations/customers',
  'reports-filters': '/operations/reports?period=custom&start_date=2026-09-01&end_date=2026-11-16', 'staff-filters': '/hr/staff' };
// Opens a page's shared filter panel ("Search and filter …" / "Filter …").
const openFilterPanel = (page) => page.getByRole('button', { name: /^(Search and filter|Search|Filter) / }).first().click();
// Pages shot after a click on the loaded route (a form opened over it).
const OPEN = {
  'record-milk': (page) => page.getByRole('button', { name: /Record milk/i }).first().click(),
  'ledger-entry': (page) => page.getByRole('button', { name: /Log income/i }).first().click(),
  // The filter panel open, with a search typed (so Reset filters and the results line show).
  'ledger-filters': async (page) => {
    await openFilterPanel(page);
    await page.getByRole('searchbox').fill('Unga');
    await page.waitForTimeout(600);
  },
  'production-log-filters': openFilterPanel,
  'milk-usage-filters': openFilterPanel,
  'herd-filters': openFilterPanel,
  'medical-filters': openFilterPanel,
  'milk-history-filters': openFilterPanel,
  'safety-filters': openFilterPanel,
  'inventory-filters': openFilterPanel,
  'buyers-filters': openFilterPanel,
  'customers-filters': openFilterPanel,
  'reports-filters': openFilterPanel,
  'staff-filters': openFilterPanel,
  // Below xl the Ledger is a list whose rows open a sheet (the table has no sheet: nothing to tap).
  'ledger-sheet': async (page) => {
    const row = page.locator('[data-record-id]').first();
    if (await row.count()) await row.click();
  },
  // Historical Checks opens in a dialog; its filter panel is inside.
  'breeding-history': async (page) => {
    await page.getByRole('button', { name: 'View all historical checks' }).first().click();
    await openFilterPanel(page);
  },
};
const PAGES = (process.env.SCREENS_PAGES ?? 'ledger,production-log,reports').split(',').map((name) => name.trim()).filter(Boolean);
const unknownPage = PAGES.find((name) => !(name in ROUTES));
if (unknownPage) throw new Error(`Unknown page "${unknownPage}". Known: ${Object.keys(ROUTES).join(', ')}`);

// ── Ledger fixtures ────────────────────────────────────────────────────────────
const isoWeek = (iso) => {
  const date = new Date(`${iso}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
const bucketOf = (iso) => ({ year: iso.slice(0, 4), month: iso.slice(0, 7), week: isoWeek(iso), day: iso });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const tx = (id, date, type, fields) => ({
  id, date, transaction_type: type, status: 'POSTED', attachments: [], receipt_available: false, reference_code: '', ...fields, bucket: bucketOf(date),
});
const LEDGER = [
  tx(1, '2026-11-03', 'Expense', { counterparty_name: 'Unga Feeds Ltd', category: 'Feed Purchase', item_name: 'Dairy meal 70 kg × 12', description: 'Purchased quantity: 840 kg · Twelve bags of dairy meal for the milking herd, delivered by lorry to the main gate; the driver was paid separately for offloading.', reference_code: 'INV-2026-11-0042', amount: 55914.25, attachments: [{ id: 7, url: '/api/finance/transactions/1/attachments/7', content_type: 'image/jpeg', filename: 'invoice.jpg' }] }),
  tx(2, '2026-11-03', 'Expense', { counterparty_name: 'Dr. Wanjiku Vet Services', category: 'Veterinary & Medicine', item_name: 'AI service', description: 'AI service and pregnancy check for Neema (KE-0012).', reference_code: 'SFX9K2L1QA', amount: 15025 }),
  tx(3, '2026-10-31', 'Expense', { counterparty_name: 'Farm wages', category: 'Labour', item_name: 'October wages', description: 'October wages for two farm hands.', reference_code: 'PAY-2026-10', amount: 24000 }),
  tx(4, '2026-10-28', 'Revenue', { counterparty_name: 'Brookside Dairy', customer_id: 4, category: 'Milk Sale', description: 'Milk delivered 1–28 Oct, 1,080 L at the cooperative rate.', reference_code: 'SJK3H7P2LM', amount: 48600, receipt_available: true, receipt: { id: 11 } }),
  tx(5, '2026-10-28', 'Revenue', { counterparty_name: 'Auntie Grace', customer_id: 5, category: 'Milk Sale', description: 'Morning milk, 80 L on credit.', reference_code: '', amount: 3200, status: 'PENDING' }),
  tx(6, '2026-10-15', 'Revenue', { counterparty_name: 'Nakuru County Show', category: 'Other Income', item_name: 'Best heifer prize', description: 'Prize money for best Friesian heifer.', reference_code: 'SHOW-118', amount: 5000 }),
  tx(7, '2026-10-15', 'Expense', { counterparty_name: 'Kamau Transport', category: 'Transport', item_name: 'Boda to town', description: 'Transport of milk cans to the collection centre.', amount: 2500 }),
  tx(8, '2026-09-30', 'Revenue', { counterparty_name: 'Brookside Dairy', customer_id: 4, category: 'Milk Sale', description: 'Milk delivered in September, 917 L.', reference_code: 'SIH2K9D4PQ', amount: 41250, receipt_available: true, receipt: { id: 12 } }),
  tx(9, '2026-09-12', 'Expense', { counterparty_name: 'Agrovet Store', category: 'Veterinary & Medicine', item_name: 'Dewormer and acaricide', description: 'Dewormer for the whole herd and two litres of acaricide.', reference_code: 'AGV-5531', amount: 6480.5 }),
];

const cents = (amount) => Math.round(amount * 100);
const totalsOf = (rows) => {
  const income = rows.filter((row) => row.transaction_type === 'Revenue').reduce((sum, row) => sum + cents(row.amount), 0);
  const expenses = rows.filter((row) => row.transaction_type === 'Expense').reduce((sum, row) => sum + cents(row.amount), 0);
  return { count: rows.length, income: String(income), expenses: String(expenses), net: String(income - expenses) };
};
const inRange = (rows, from, to) => rows.filter((row) => (!from || row.date >= from) && (!to || row.date <= to));
const applyFilters = (rows, params) => {
  const type = params.get('type');
  const category = params.get('category');
  const search = (params.get('search') ?? '').toLowerCase();
  return inRange(rows, params.get('date_from'), params.get('date_to')).filter((row) => (
    (!type || (type === 'revenue' ? row.transaction_type === 'Revenue' : row.transaction_type === 'Expense'))
    && (!category || row.category === category)
    && (!search || JSON.stringify(row).toLowerCase().includes(search))
  ));
};

const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
function ledgerSummary(params) {
  const period = params.get('period');
  const anchor = params.get('anchor') ?? '2026-11-06';
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  let frame;
  if (period === 'custom') {
    const from = params.get('date_from');
    const to = params.get('date_to');
    frame = { period, key: `${from}_${to}`, label: `${from} – ${to}`, range: { from, to }, has_next: false, previous: null, breakdown: [] };
  } else if (period === 'year') {
    const breakdown = MONTHS.map((short, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      const rows = LEDGER.filter((row) => row.date.startsWith(key));
      return { key, label: `${short} ${year}`, short_label: short, ...totalsOf(rows) };
    });
    frame = { period, key: String(year), label: String(year), range: { from: `${year}-01-01`, to: `${year}-12-31` }, has_next: year < 2026, previous: { key: String(year - 1), label: String(year - 1), range: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` } }, breakdown };
  } else {
    const key = anchor.slice(0, 7);
    const to = `${key}-${String(lastDay(year, month)).padStart(2, '0')}`;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const breakdown = Array.from({ length: lastDay(year, month) }, (_, index) => {
      const day = `${key}-${String(index + 1).padStart(2, '0')}`;
      return { key: day, label: `${String(index + 1).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`, short_label: String(index + 1), ...totalsOf(LEDGER.filter((row) => row.date === day)) };
    });
    frame = { period: 'month', key, label: `${MONTHS[month - 1]} ${year}`, range: { from: `${key}-01`, to }, has_next: key < '2026-11', previous: { key: prevKey, label: `${MONTHS[prevMonth - 1]} ${prevYear}`, range: { from: `${prevKey}-01`, to: `${prevKey}-${lastDay(prevYear, prevMonth)}` } }, breakdown };
  }
  const scoped = applyFilters(inRange(LEDGER, frame.range.from, frame.range.to), params);
  const current = { ...totalsOf(scoped), unpaid: frame.period === 'year' ? '1598600' : '320000' };
  let previous = null;
  let change = null;
  if (frame.previous) {
    const prevRows = applyFilters(inRange(LEDGER, frame.previous.range.from, frame.previous.range.to), params);
    previous = { key: frame.previous.key, label: frame.previous.label, ...totalsOf(prevRows), unpaid: '0' };
    if (prevRows.length > 0 && Number(previous.net) !== 0) {
      const pct = ((Number(current.net) - Number(previous.net)) / Math.abs(Number(previous.net))) * 100;
      change = { net_abs: String(Number(current.net) - Number(previous.net)), net_pct: pct.toFixed(1) };
    }
  }
  return { ...frame, current, previous, change };
}

// "2 – 8 Nov": the Monday–Sunday week a day falls in, as the backend labels weeks.
function weekLabel(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() || 7) - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const part = (value) => `${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]}`;
  return monday.getUTCMonth() === sunday.getUTCMonth() ? `${monday.getUTCDate()} – ${part(sunday)}` : `${part(monday)} – ${part(sunday)}`;
}

function ledgerGroups(params) {
  const levels = (params.get('levels') ?? 'year,month,week,day').split(',');
  const rows = applyFilters(LEDGER, params);
  const groups = new Map();
  rows.forEach((row) => {
    const { year, month, week, day } = row.bucket;
    const add = (level, key, parent, label) => {
      if (!levels.includes(level)) return;
      const entry = groups.get(key) ?? { level, key, parent, label, rows: [] };
      entry.rows.push(row);
      groups.set(key, entry);
    };
    add('year', year, null, year);
    add('month', month, levels.includes('year') ? year : null, MONTH_NAMES[Number(month.slice(5)) - 1]);
    add('week', week, month, weekLabel(day));
    add('day', day, levels.includes('week') ? week : month, `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(8)}, ${day.slice(0, 4)}`);
  });
  return { groups: [...groups.values()].map(({ rows: groupRows, ...group }) => ({ ...group, ...totalsOf(groupRows) })) };
}

function ledgerList(params) {
  const rows = applyFilters(LEDGER, params);
  // KPI figures as GET /api/finance/ledger sends them: amounts in KES, margin as a 1-dp string.
  const totals = totalsOf(rows);
  const [income, expenses] = [Number(totals.income) / 100, Number(totals.expenses) / 100];
  return {
    items: rows,
    meta: { total: rows.length, pages: 1 },
    summary: {
      recognized_sales: income,
      posted_costs: expenses,
      net_profit: income - expenses,
      profit_margin_pct: income ? (((income - expenses) / income) * 100).toFixed(1) : null,
      outstanding_receivables: 37030,
      customer_credit: 636,
      ledger_records: rows.length,
    },
    summary_scope: { mode: params.get('search') ? 'search' : 'all', search_query: params.get('search') || null },
  };
}

const CATEGORIES = {
  revenue: [{ value: 'Milk Sale', label: 'Milk Sale' }, { value: 'Other Income', label: 'Other Income' }],
  expense: [
    { value: 'Feed Purchase', label: 'Feed Purchase', default_cost_class: 'COGS' },
    { value: 'Veterinary & Medicine', label: 'Veterinary & Medicine', default_cost_class: 'COGS' },
    { value: 'Labour', label: 'Labour', default_cost_class: 'OPERATING' },
    { value: 'Transport', label: 'Transport', default_cost_class: 'OPERATING' },
  ],
  cost_classes: [{ value: 'COGS', label: 'Production cost' }, { value: 'OPERATING', label: 'Running cost' }],
};

// ── Production fixtures (the agreed Production Log layout's data) ─────────────
const PRODUCTION_SUMMARY = {
  period: 'month', key: '2026-11', label: 'Nov 2026', range: { from: '2026-11-01', to: '2026-11-30' }, has_next: false,
  current: { litres: '246.0', entries: 36, milking_days: 6, avg_litres_per_day: '41.0' },
  previous: { key: '2026-10', label: 'Oct 2026', litres: '1306.4' },
  change: { litres_abs: '-1060.4', litres_pct: '-81.2' },
  breakdown: [],
};
const PRODUCTION_GROUPS = { groups: [
  { level: 'year', key: '2026', label: '2026', litres: '12345.6', entries: 900, avg_litres_per_day: '40.2' },
  { level: 'month', key: '2026-11', parent: '2026', label: 'November', litres: '246.0', entries: 36, avg_litres_per_day: '41.0' },
  { level: 'week', key: '2026-W45', parent: '2026-11', label: '3 – 9 Nov', litres: '198.5', entries: 24, avg_litres_per_day: '39.7' },
  { level: 'day', key: '2026-11-06', parent: '2026-W45', label: 'Nov 06, 2026', litres: '23.5', entries: 2, avg_litres_per_day: '23.5' },
  { level: 'week', key: '2026-W44', parent: '2026-11', label: '27 Oct – 2 Nov', litres: '1306.4', entries: 12, avg_litres_per_day: '43.5' },
] };
const YIELD = [
  { id: 1, date: '2026-11-06', session: 'morning', milker_name: '254712345678', cow_tag: 'KE-0046', cow_name: 'Malaika wa Kwanza', amount: '14.5', status: 'VERIFIED', bucket: bucketOf('2026-11-06') },
  { id: 2, date: '2026-11-06', session: 'evening', milker_name: 'Wanjiru', cow_tag: 'KE-0012', cow_name: 'Neema', amount: '9.0', status: 'RECORDED', bucket: bucketOf('2026-11-06') },
];
// The yield list's `summary` (status counts for the same filters), as the backend sends it.
const YIELD_SUMMARY = { total_records: 2, total_volume: 23.5, verified_count: 1, recorded_count: 1, flagged_count: 0, isolated_count: 0 };

// ── Herd fixtures (typography phase 3) ─────────────────────────────────────────
const COWS = [
  { id: 1, tag_number: 'KE-0012', name: 'Neema', breed_status: 'Friesian', current_status: 'Lactating', date_of_birth: '2021-03-14', last_calved: '2026-08-02', updated_at: '2026-11-15T07:30:00Z' },
  { id: 2, tag_number: 'KE-0046', name: 'Malaika wa Kwanza', breed_status: 'Ayrshire', current_status: 'Lactating', date_of_birth: '2020-06-01', last_calved: '2026-05-19', updated_at: '2026-11-14T18:05:00Z' },
  { id: 3, tag_number: 'KE-0101', name: 'Zawadi', breed_status: 'Friesian', current_status: 'Dry', date_of_birth: '2019-11-23', last_calved: '2025-12-30', updated_at: '2026-11-10T09:00:00Z' },
  { id: 4, tag_number: 'KE-0150', name: 'Baraka', breed_status: 'Jersey', current_status: 'Heifer', date_of_birth: '2024-09-09', last_calved: null, updated_at: '2026-11-01T12:00:00Z' },
];
const HERD = { items: COWS, meta: { total: COWS.length, pages: 1 }, summary: { total_count: 4, milking_count: 2, dry_count: 1, average_age_months: 46, latest_calved: '2026-08-02' } };
const BREEDING_LOGS = [
  { id: 11, cow_id: 1, cow_tag: 'KE-0012', cow_name: 'Neema', ai_date: '2026-10-01', sire_code: 'FR-2231', semen_source: 'farm_stock', status: 'Pending', expected_calving_date: '2027-07-11', days_post_ai: 47 },
  { id: 12, cow_id: 2, cow_tag: 'KE-0046', cow_name: 'Malaika wa Kwanza', ai_date: '2026-07-20', sire_code: 'AY-0907', semen_source: 'vet_provided', status: 'Pregnant', expected_calving_date: '2027-04-29', days_post_ai: 120 },
];
const SEMEN = [{ id: 21, bull_name: 'Kahuho Star', sire_code: 'FR-2231', breed: 'Friesian', straws_left: 6, quantity: 6, breed_improvement: 'Milk volume' }];
const VET_VISITS = [
  { id: 31, cow_id: 1, cow_tag: 'KE-0012', cow_name: 'Neema', visit_date: '2026-11-12', severity: 'High', status: 'Under Treatment', signs_of_sickness: 'Swollen quarter, clots in milk', diagnosis: 'Clinical mastitis', medications: 'Intramammary antibiotic, 3 days', follow_up_date: '2026-11-15' },
  { id: 32, cow_id: 3, cow_tag: 'KE-0101', cow_name: 'Zawadi', visit_date: '2026-10-28', severity: 'Low', status: 'Closed', signs_of_sickness: 'Lame on hind leg', diagnosis: 'Hoof overgrowth', medications: 'Hoof trimming' },
];
const MILK_DROPS = [{ id: 41, cow_id: 2, cow_tag: 'KE-0046', cow_name: 'Malaika wa Kwanza', date: '2026-11-14', delta_liters: -4.5, missing_milk: 4.5, status: 'OPEN' }];
const MILK_HISTORY = {
  animal: COWS[0],
  sessions: [
    { id: 51, date: '2026-11-15', session: 'Morning', liters: 9.5, milker: 'Wanjiru', status: 'Verified' },
    { id: 52, date: '2026-11-15', session: 'Evening', liters: 7.0, milker: 'Wanjiru', status: 'Pending' },
    { id: 53, date: '2026-11-14', session: 'Morning', liters: 9.0, milker: 'Kamau', status: 'Verified' },
  ],
  stats: { total_logged: 1240.5, session_count: 168, average_yield: 16.4, peak_yield: 21.0 },
  meta: { total: 3, pages: 1 },
};

// ── Operations & feeding fixtures (typography phase 4) ─────────────────────────
const FEEDING_TODAY = {
  totals: { total_active_animals: 12, total_daily_feed_kg: 84.5 },
  active_batches: [{ batch_id: 7, mix_name: 'Dairy mix A', remaining_kg: 310, days_left: 4 }],
  groups: [
    { feeding_group: 'lactating', headcount: 8, feeding_times_per_day: 2, kg_per_head_per_feeding: 3.5, group_batch_per_feeding_kg: 28, daily_group_batch_kg: 56, active_batch_id: 7, mix_name: 'Dairy mix A', ready: true, quantity_label: '28 kg per feeding', physical_measures: { group_buckets_per_feeding: 2 } },
    { feeding_group: 'dry', headcount: 3, feeding_times_per_day: 2, kg_per_head_per_feeding: 2, group_batch_per_feeding_kg: 6, daily_group_batch_kg: 12, active_batch_id: null, ready: false, not_ready_reason: 'NO_ACTIVE_BATCH', not_ready_message: 'No active batch for this group.' },
  ],
};
const RECIPES = [
  { id: 1, name: 'Dairy mix A', recipe_type: 'LACTATING', target_protein_percentage: 16, ingredients: [{ name: 'Maize germ', percentage: 60 }, { name: 'Sunflower cake', percentage: 30 }, { name: 'Mineral lick', percentage: 10 }] },
  { id: 2, name: 'Dry cow mix', recipe_type: 'DRY', target_protein_percentage: 12, ingredients: [{ name: 'Wheat bran', percentage: 70 }, { name: 'Cotton seed cake', percentage: 30 }] },
];
const CONVERSIONS = [{ id: 1, item_id: 3, item_name: 'Dairy meal', unit_name: 'Bucket', kg_equivalent: 8.5 }, { id: 2, item_id: 4, item_name: 'Maize germ', unit_name: 'Sack', kg_equivalent: 70 }];
const ROUTINE = [
  { id: 1, title: 'Morning milking', start_time: '05:00', end_time: '06:30', notes: 'Clean udders first.', checklist_items: ['Wash udders', 'Strip test', 'Milk'], display_order: 1 },
  { id: 2, title: 'Feeding', start_time: '07:00', end_time: '07:45', notes: '', checklist_items: ['Dairy mix A to lactating cows'], display_order: 2 },
];
const DISPOSITIONS = [
  // As MilkDispositionService.serialize sends them. CALF_FEED is the only type the backend
  // allows (a check constraint on milk_dispositions), and each one names its calf.
  { id: 1, type: 'CALF_FEED', disposition_type: 'CALF_FEED', date: '2026-11-15', disposition_date: '2026-11-15', liters: 4, calf_id: 150, calf: { id: 150, name: 'Baraka', tag_number: 'KE-0150' }, notes: '', recorded_by: 'Wanjiru' },
  { id: 2, type: 'CALF_FEED', disposition_type: 'CALF_FEED', date: '2026-11-14', disposition_date: '2026-11-14', liters: 2, calf_id: 151, calf: { id: 151, name: 'Zawadi', tag_number: 'KE-0151' }, notes: 'Bottle, evening', recorded_by: 'Kamau' },
];

// ── Finance, supply and report fixtures (typography phase 5a) ──────────────────
const CUSTOMERS = [
  { id: 4, name: 'Brookside Dairy', type: 'Cooperative', contact_person: 'Jane Wambui', phone_number: '+254712345678', agreed_rate_per_liter: 45, account_balance: 12500, daily_contract_liters: 40 },
  { id: 5, name: 'Auntie Grace', type: 'Individual', contact_person: '', phone_number: '+254722000111', agreed_rate_per_liter: 50, account_balance: -636, daily_contract_liters: 3 },
  { id: 6, name: 'Mama Mboga Hotel', type: 'Hotel', contact_person: 'Peter Otieno', phone_number: '+254733222444', agreed_rate_per_liter: 55, account_balance: 0, daily_contract_liters: 10 },
];
const DELIVERIES = [
  { id: 71, customer_id: 4, date: '2026-11-15', liters_delivered: 40, billable_liters: 40, personal_consumption_liters: 0, billed_amount: 1800, amount: 1800 },
  { id: 72, customer_id: 4, date: '2026-11-14', liters_delivered: 38.5, billable_liters: 38.5, personal_consumption_liters: 0, billed_amount: 1732.5, amount: 1732.5 },
];
const INVENTORY = [
  { id: 3, name: 'Dairy meal', category: 'Bulk Feed', unit: 'kg', current_qty: 420, reorder_level: 200, item_code: 'FD-001', is_active: true },
  { id: 4, name: 'Maize germ', category: 'Bulk Feed', unit: 'kg', current_qty: 90, reorder_level: 150, item_code: 'FD-002', is_active: true },
  { id: 8, name: 'Teat dip', category: 'Medicine', unit: 'litre', current_qty: 6, reorder_level: 2, item_code: 'MD-010', is_active: true },
];
const MILK_INVENTORY = {
  summary: { total_produced: 1240.5, total_sold: 1102, total_unsold: 138.5 },
  daily_records: [
    { date: '2026-11-15', produced: 82, sold: 75, unsold: 7, remaining: 7 },
    { date: '2026-11-14', produced: 79.5, sold: 70, unsold: 9.5, remaining: 9.5 },
  ],
};

// ── Compliance and HR fixtures (typography phase 5b) ───────────────────────────
const HARDLOCKS = { items: [
  { hardlock_id: 81, cow_id: 1, cow_tag: 'KE-0012', cow_name: 'Neema', reason: 'Antibiotic withdrawal', severity: 'HIGH', medication: 'Intramammary antibiotic', withdrawal_active: true, withdrawal_ends_at: '2026-11-20T06:00:00Z', vet_name: 'Dr. Wanjiku', can_release: true, updated_at: '2026-11-12T09:00:00Z' },
  { hardlock_id: 82, cow_id: 2, cow_tag: 'KE-0046', cow_name: 'Malaika wa Kwanza', reason: 'Failed milk test', severity: 'MEDIUM', withdrawal_active: false, can_release: true, updated_at: '2026-11-15T07:00:00Z' },
], meta: { total: 2 } };
const STAFF = [
  { id: 91, name: 'Wanjiru Kamau', role: 'FARM_HAND', phone_number: '+254712000222', status: 'ACTIVE', base_salary: 15000, loan_balance: 2000, statutory_deductions_enabled: true },
  { id: 92, name: 'Kamau Otieno', role: 'MILKER', phone_number: '+254722000333', status: 'ON_LEAVE', base_salary: 12000, loan_balance: 0, leave_type: 'Annual', leave_start_date: '2026-11-10', leave_end_date: '2026-11-20' },
];

function handle(method, path, params, body) {
  if (method === 'POST' && path === '/auth/register') {
    return [201, {
      id: 1, name: body.farm_name, username: body.phone_number, role: 'FARMER', tenant_type: 'single', tenant_id: 'tenant_1',
      farm_id: 'farm_1', farm_name: 'Shamba', available_farms: [], phone_number: `+${body.phone_number}`, auth_state: 'ACTIVE',
      access_token: 'screens-token',
      account_flags: { needs_phone: false, phone_verified: true, email_verified: false, has_password: true, linked_providers: [] },
    }];
  }
  if (method === 'GET' && path === '/auth/me') return [401, { msg: 'Missing JWT' }];
  if (method !== 'GET') return [200, {}];
  if (path === '/ledger/summary') return [200, ledgerSummary(params)];
  if (path === '/ledger/group-totals') return [200, ledgerGroups(params)];
  if (path === '/finance/ledger') return [200, ledgerList(params)];
  if (path === '/finance/categories') return [200, CATEGORIES];
  if (path === '/production/summary') return [200, PRODUCTION_SUMMARY];
  if (path === '/production/group-totals') return [200, PRODUCTION_GROUPS];
  if (path === '/production/yield') return [200, { items: YIELD, summary: YIELD_SUMMARY, meta: { pages: 1 } }];
  if (path === '/herd') return [200, HERD];
  if (path === '/herd/1' || path === '/animals/1') return [200, COWS[0]];
  if (path === '/animals/1/milk-history') return [200, MILK_HISTORY];
  if (path === '/animals/1/events') return [200, { items: [{ id: 61, type: 'Health', title: 'Mastitis treatment started', description: 'Intramammary antibiotic, 3 days.', date: '2026-11-12' }, { id: 62, type: 'Breeding', title: 'AI service', description: 'Sire FR-2231.', date: '2026-10-01' }], meta: { total: 2, pages: 1 } }];
  if (path === '/operations/breeding-logs') return [200, BREEDING_LOGS];
  if (path === '/operations/semen-inventory') return [200, SEMEN];
  if (path === '/clinical/vet-visits' || path === '/medical/records') return [200, VET_VISITS];
  if (path === '/production/milk-drop-alerts') return [200, MILK_DROPS];
  if (path === '/v1/nutrition/feeding/today') return [200, FEEDING_TODAY];
  if (path === '/feed/recipes') return [200, RECIPES];
  if (path === '/units/conversions') return [200, CONVERSIONS];
  if (path === '/routine/plans') return [200, ROUTINE];
  if (path === '/production/milk-dispositions') return [200, { items: DISPOSITIONS, count: DISPOSITIONS.length }];
  if (path === '/finance/customers') return [200, CUSTOMERS];
  if (path === '/finance/customers/4') return [200, CUSTOMERS[0]];
  if (path === '/finance/deliveries') return [200, DELIVERIES];
  if (path === '/inventory/items') return [200, INVENTORY];
  if (path === '/reports/milk-inventory') return [200, MILK_INVENTORY];
  if (path === '/veterinary/hardlocks/active') return [200, HARDLOCKS];
  if (path === '/hr/staff') return [200, STAFF];
  if (path === '/hr/staffing-recommendations') return [200, { employee_count: 2, farm_size: 'small', note: 'Two people can run a herd of this size.' }];
  return [200, []];
}

async function capture(browser, width, height) {
  const context = await browser.newContext({
    viewport: { width, height }, locale: 'en-KE', timezoneId: 'Africa/Nairobi', serviceWorkers: 'block',
    deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768,
  });
  const page = await context.newPage();
  // The saved session is verified against /auth/me; keep it valid after registering.
  let registered = false;
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch { /* not JSON */ }
    let [status, payload] = handle(request.method(), path, url.searchParams, body);
    if (path === '/auth/register') registered = true;
    if (path === '/auth/me' && registered) [status, payload] = [200, { ...handle('POST', '/auth/register', url.searchParams, { phone_number: '254712000000' })[1] }];
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  // The app scrolls inside <main>, not the document, so grow the viewport to fit it.
  const shoot = async (name) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    const fullHeight = await page.evaluate(() => {
      const scroller = document.querySelector('main .overflow-y-auto');
      const content = scroller ? scroller.scrollHeight + scroller.getBoundingClientRect().top : document.documentElement.scrollHeight;
      return Math.ceil(content + 96);
    });
    await page.setViewportSize({ width, height: Math.max(height, fullHeight) });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${name}-${width}.png` });
    await page.setViewportSize({ width, height });
  };

  if (PAGES.includes('login')) {
    await page.goto(`${BASE_URL}/login`);
    await shoot('login');
  }
  await page.goto(`${BASE_URL}/register`);
  if (PAGES.includes('register')) await shoot('register');
  await page.getByLabel('Farm name').fill('Shamba');
  await page.getByLabel('Phone number').fill('0712000000');
  await page.getByLabel('Password', { exact: true }).fill('Maziwa1234a');
  await page.getByRole('button', { name: /Create farm account/ }).click();
  await page.waitForURL((url) => !url.pathname.includes('/register'));
  if (PAGES.includes('home')) await shoot('home');

  for (const name of PAGES.filter((page) => ROUTES[page])) {
    if (name === 'register' || name === 'login') continue;
    await page.goto(`${BASE_URL}${ROUTES[name]}`);
    if (OPEN[name]) {
      await page.waitForLoadState('networkidle');
      await OPEN[name](page);
    }
    await shoot(name);
  }
  await context.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  await capture(browser, 1280, 900);
  await capture(browser, 390, 844);
} finally {
  await browser.close();
}
console.log(`Saved ${LABEL} screenshots to ${OUT_DIR}/`);
