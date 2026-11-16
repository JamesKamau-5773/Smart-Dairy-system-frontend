// Screenshots of the Ledger and the Production Log at 1280px and 390px, for UI audits.
// The API is answered in the browser by the fixtures below, which aggregate their own
// records the way the backend does, so before/after shots show the same figures.
//
//   npm run build -- --mode development   (or a normal build with VITE_API_BASE_URL set)
//   VITE_API_BASE_URL=http://api.e2e.test npm run build && npx vite preview --port 4173 &
//   node e2e/manual/period-pages-screens.mjs before   # or: after
//
// Output: docs/audit/screens/<label>-<page>-<width>.png (or SCREENS_OUT_DIR)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const LABEL = process.argv[2] ?? 'after';
const BASE_URL = process.env.SCREENS_BASE_URL ?? 'http://localhost:4173';
const API_ORIGIN = 'http://api.e2e.test';
const OUT_DIR = process.env.SCREENS_OUT_DIR ?? 'docs/audit/screens';

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
  return {
    items: rows,
    meta: { total: rows.length, pages: 1 },
    summary: { outstanding_receivables: 37030, customer_credit: 636, ledger_records: rows.length },
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
  if (path === '/production/yield') return [200, YIELD];
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

  await page.goto(`${BASE_URL}/register`);
  await page.getByLabel('Farm name').fill('Shamba');
  await page.getByLabel('Phone number').fill('0712000000');
  await page.getByLabel('Password', { exact: true }).fill('Maziwa1234a');
  await page.getByRole('button', { name: /Create farm account/ }).click();
  await page.waitForURL((url) => !url.pathname.includes('/register'));

  const shots = [
    ['ledger', '/finance/ledger'],
    ['production-log', '/operations/yield'],
    ['reports', '/operations/reports?period=custom&start_date=2026-09-01&end_date=2026-11-16'],
  ];
  for (const [name, route] of shots) {
    await page.goto(`${BASE_URL}${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    // The app scrolls inside <main>, not the document, so grow the viewport to fit it.
    const fullHeight = await page.evaluate(() => {
      const scroller = document.querySelector('main .overflow-y-auto');
      return scroller ? Math.ceil(scroller.scrollHeight + scroller.getBoundingClientRect().top + 96) : 0;
    });
    await page.setViewportSize({ width, height: Math.max(height, fullHeight) });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${name}-${width}.png` });
    await page.setViewportSize({ width, height });
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
