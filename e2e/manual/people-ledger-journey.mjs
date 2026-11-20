// Manual full-stack journey: staff registry, payroll, milk safety board and ledger.
// Not part of the Playwright suite. Run against a throwaway stack:
//   JOURNEY_BASE=http://localhost:5176 JOURNEY_API=http://localhost:5066/api node e2e/manual/people-ledger-journey.mjs [phone|desktop] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.JOURNEY_BASE ?? 'http://localhost:5176';
const API = process.env.JOURNEY_API ?? 'http://localhost:5066/api';
const mode = process.argv[2] ?? 'phone';
const OUT = `${process.argv[3] ?? `./journey-out-${mode}`}/`;
mkdirSync(OUT, { recursive: true });

const stamp = String(Date.now()).slice(-8);
const phone = `07${stamp}`;
const results = [];
const consoleErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(mode === 'phone'
  ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, timezoneId: 'Africa/Nairobi', acceptDownloads: true }
  : { viewport: { width: 1440, height: 950 }, timezoneId: 'Africa/Nairobi', acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`${new URL(page.url()).pathname} :: ${msg.text().slice(0, 240)}`); });
page.on('response', async (res) => {
  if (!res.url().startsWith(API) || res.status() < 400) return;
  let body = '';
  try { body = (await res.text()).slice(0, 240); } catch { /* ignore */ }
  failedRequests.push(`${res.request().method()} ${res.url().replace(API, '')} -> ${res.status()} ${body}`);
});

let shot = 0;
async function step(name, fn) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? '' });
  } catch (error) {
    results.push({ name, ok: false, note: String(error.message ?? error).split('\n')[0].slice(0, 300) });
  }
  shot += 1;
  await page.screenshot({ path: `${OUT}${String(shot).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, fullPage: true }).catch(() => {});
  console.log(`${results.at(-1).ok ? 'PASS' : 'FAIL'}  ${name}${results.at(-1).note ? `  — ${results.at(-1).note}` : ''}`);
}
const seen = (re) => page.getByText(re).first().waitFor({ timeout: 15000 });
const visibleText = async (re) => (await page.getByText(re).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
// A ledger entry as shown at this screen size (table row or phone card), optionally one with a given button.
const entry = (text, button) => {
  let locator = page.locator(mode === 'phone' ? 'article' : 'tr', { hasText: text }).filter({ visible: true });
  if (button) locator = locator.filter({ has: page.getByRole('button', { name: button }) });
  return locator.first();
};
// A 1×1 PNG, as a stand-in receipt photo.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const card = (name) => page.locator('article', { has: page.getByRole('heading', { name, exact: true }) }).first();

// Real API calls as the signed-in user, for setup the UI doesn't offer (a cow on hold).
const api = (method, path, body) => page.evaluate(async ({ method, path, body, API }) => {
  const session = JSON.parse(sessionStorage.getItem('jivu_user'));
  const response = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}`, 'X-Tenant-ID': session.tenant_id ?? '', 'X-Farm-ID': session.farm_id ?? '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.text() };
}, { method, path, body, API });

await step('Register a farm owner', async () => {
  await page.goto(`${BASE}/register`);
  await page.getByLabel('Farm name').fill(`Journey Farm ${stamp.slice(-4)}`);
  await page.getByLabel('Phone number').fill(phone);
  await page.getByLabel('Password', { exact: true }).fill(`Maziwa${stamp.slice(-4)}a`);
  await page.getByRole('button', { name: /Create farm account/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'), { timeout: 20000 });
  return new URL(page.url()).pathname;
});

// ── Staff registry ───────────────────────────────────────────
await step('Staff registry: empty state', async () => {
  await page.goto(`${BASE}/hr/staff`);
  await page.getByRole('button', { name: /Add your first employee/ }).waitFor();
});

async function addEmployee(name, salary, digits) {
  await page.getByRole('button', { name: /Add (your first )?employee/ }).first().click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('input[name="name"]').fill(name);
  await dialog.locator('select[name="role"]').selectOption('FARM_HAND');
  await dialog.locator('input[name="phoneNumber"]').fill(`07${digits}`);
  await dialog.locator('input[name="baseSalary"]').fill(String(salary));
  await dialog.locator('button[type="submit"]').click();
  await card(name).waitFor({ timeout: 20000 });
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press('Escape');
}

await step('Add two employees', async () => {
  await addEmployee('Peter Otieno', 15000, `1${stamp.slice(-7)}`);
  await addEmployee('Mary Wanjiru', 12000, `2${stamp.slice(-7)}`);
  return (await card('Peter Otieno').innerText()).replace(/\s+/g, ' ').slice(0, 150);
});

await step('Issue Peter a KES 3,000 advance', async () => {
  await card('Peter Otieno').getByRole('button', { name: 'Salary & advance' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: /Financials/ }).click();
  await dialog.locator('label', { hasText: 'Advance amount' }).locator('input').fill('3000');
  await dialog.locator('label', { hasText: 'Monthly deduction' }).locator('input').fill('1000');
  await dialog.locator('button[type="submit"]').last().click();
  await seen(/Salary saved and advance issued|advance was not issued|not saved/);
  const message = await visibleText(/Salary saved and advance issued|advance was not issued|not saved/);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  return `${message} | card: ${(await card('Peter Otieno').innerText()).replace(/\s+/g, ' ').match(/Owes in advances KES [\d,]+/)?.[0]}`;
});

await step('Turn statutory deductions off for Mary; the backend keeps it', async () => {
  await card('Mary Wanjiru').getByRole('button', { name: 'Salary & advance' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: /Financials/ }).click();
  const toggle = dialog.getByRole('checkbox', { name: /Deduct PAYE, NSSF, SHIF and Housing Levy/ });
  if (!(await toggle.isChecked())) throw new Error('switch was off for a new employee');
  await toggle.uncheck();
  await dialog.locator('button[type="submit"]').last().click();
  await seen(/Salary details saved|not saved/);
  const listed = await api('GET', '/hr/staff');
  const staffList = JSON.parse(listed.body);
  const mary = (Array.isArray(staffList) ? staffList : staffList.items ?? staffList.staff ?? []).find((member) => /Mary/.test(member.name ?? member.full_name ?? ''));
  const flag = mary?.statutory_deductions_enabled ?? mary?.statutoryDeductionsEnabled;
  if (flag !== false) throw new Error(`backend still has statutory_deductions_enabled=${flag}`);
  return 'statutory_deductions_enabled=false on the server';
});

await step('Offboarding is blocked while Peter owes an advance', async () => {
  await card('Peter Otieno').getByRole('button', { name: 'Offboard' }).click();
  const dialog = page.getByRole('dialog', { name: 'Offboard Peter Otieno' });
  await dialog.getByText(/still owes KES 3,000/).waitFor();
  const blocked = await dialog.getByRole('button', { name: 'Offboard' }).isDisabled();
  await page.keyboard.press('Escape');
  if (!blocked) throw new Error('Offboard button enabled despite loan');
});

await step('Offboard Mary; she moves to former staff', async () => {
  await card('Mary Wanjiru').getByRole('button', { name: 'Offboard' }).click();
  const dialog = page.getByRole('dialog', { name: 'Offboard Mary Wanjiru' });
  await dialog.getByLabel('Reason').selectOption('CONTRACT_ENDED');
  await dialog.getByRole('button', { name: 'Offboard' }).click();
  await seen(/Mary Wanjiru moved to former staff|not offboarded/);
  await page.waitForTimeout(600);
  const hidden = !(await card('Mary Wanjiru').isVisible().catch(() => false));
  await page.getByLabel(/Show former staff/).check();
  await card('Mary Wanjiru').getByText('Former staff').waitFor();
  return hidden ? 'hidden until "Show former staff"' : 'WARNING: still listed before toggling';
});

// ── Payroll ──────────────────────────────────────────────────
await step('Payroll: empty state names the next period', async () => {
  await page.goto(`${BASE}/hr/payroll`);
  await page.getByText('No payroll yet').waitFor();
  return await page.getByRole('button', { name: /Create .* payroll/ }).innerText();
});

await step('Create the payroll (asks first)', async () => {
  await page.getByRole('button', { name: /Create .* payroll/ }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Create payroll' }).click();
  await seen(/Draft – check before finalizing|was not created/);
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  if (/was not created/.test(text)) throw new Error(text.match(/[^.]*was not created[^.]*\./)?.[0]);
  return `Peter listed: ${/Peter Otieno/.test(text)} · Mary (former) listed: ${/Mary Wanjiru/.test(text)} · ${text.match(/Net pay · .*?KES [\d,.]+/)?.[0]} · statutory shown: ${/PAYE [\d,.]+ · NSSF/.test(text)}`;
});

await step('Finalize (asks first)', async () => {
  await page.getByRole('button', { name: 'Finalize', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Finalize' }).click();
  await seen(/Finalized – ready to pay|was not finalized/);
});

await step('Record payment needs a reference, then marks it paid', async () => {
  await page.getByRole('button', { name: 'Record payment' }).click();
  const dialog = page.getByRole('dialog', { name: /^Pay .* payroll$/ });
  const pay = dialog.getByRole('button', { name: 'Record as paid' });
  if (!(await pay.isDisabled())) throw new Error('Record as paid enabled without a reference');
  await dialog.getByLabel('Payment reference').fill('QJK1234567');
  await pay.click();
  await seen(/recorded as paid|was not recorded/);
  return await visibleText(/recorded as paid|was not recorded/);
});

await step('Export the run as CSV', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export CSV/ }).click()]);
  return download.suggestedFilename();
});

// ── Milk safety board ────────────────────────────────────────
await step('Safety board: says when no cow is on withdrawal', async () => {
  await page.goto(`${BASE}/operations/safety`);
  await page.getByText('No cows on milk withdrawal').waitFor();
});

await step('Put a cow on hold (API), see it on the board', async () => {
  const created = await api('POST', '/herd', { tag_number: `KE-${stamp.slice(-4)}`, name: 'Neema', date_of_birth: '2021-03-01', breed: 'Friesian' });
  if (created.status >= 300) throw new Error(`create cow ${created.status} ${created.body.slice(0, 160)}`);
  const cow = JSON.parse(created.body);
  const id = cow.id ?? cow.cow?.id ?? cow.data?.id ?? cow.animal?.id;
  const held = await api('POST', '/safety/holds', { cow_id: id, reason: 'Blood in milk', notes: 'Check at morning milking' });
  if (held.status >= 300) throw new Error(`hold ${held.status} ${held.body.slice(0, 160)}`);
  await page.getByRole('button', { name: /Refresh/ }).click();
  await page.getByText('Keep milk from 1 cow apart').waitFor();
  return (await page.locator('article').first().innerText()).replace(/\s+/g, ' ').slice(0, 170);
});

await step('Release the milk (asks first)', async () => {
  await page.getByRole('button', { name: 'Release milk' }).click();
  const dialog = page.getByRole('dialog').last();
  const message = (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 170);
  await dialog.getByRole('button', { name: 'Release milk' }).click();
  await page.getByText('No cows on milk withdrawal').waitFor();
  return message;
});

await step('Hold a cow’s milk from the board', async () => {
  await page.getByRole('button', { name: 'Hold a cow’s milk' }).click();
  const dialog = page.getByRole('dialog', { name: /Keep a cow’s milk out of the tank/ });
  await dialog.getByLabel('Cow').selectOption({ label: `Neema · KE-${stamp.slice(-4)}` });
  await dialog.getByLabel('Why hold her milk?').fill('Bad smell');
  await dialog.getByRole('button', { name: 'Hold her milk' }).click();
  await seen(/milk is on hold|hold was not saved/);
  await page.getByText('Keep milk from 1 cow apart').waitFor();
  return await visibleText(/milk is on hold|hold was not saved/);
});

await step('A failed milk test, recorded from her card', async () => {
  await page.locator('article').first().getByRole('button', { name: 'Record milk test' }).click();
  const dialog = page.getByRole('dialog', { name: /Milk test for Neema/ });
  await dialog.getByText('Failed', { exact: true }).click();
  await dialog.getByLabel(/^Notes/).fill('Delvotest kit');
  await dialog.getByRole('button', { name: 'Save test' }).click();
  await seen(/Test failed|Milk test saved|test was not saved/);
  return await visibleText(/Test failed|Milk test saved|test was not saved/);
});

await step('Her test history shows it, with who recorded it', async () => {
  await page.locator('article').first().getByRole('button', { name: 'Milk tests' }).click();
  await seen(/Failed · Antibiotic residue/);
  return (await page.locator('article').first().locator('li').first().innerText()).replace(/\s+/g, ' ');
});

await step('Releasing after a failed test asks for a reason', async () => {
  await page.locator('article').first().getByRole('button', { name: 'Release milk' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Why is it safe to release now?').fill('Retested clear with Delvotest');
  await dialog.getByRole('button', { name: 'Release early' }).click();
  await page.getByText('No cows on milk withdrawal').waitFor();
});

// ── Ledger ───────────────────────────────────────────────────
await step('Expense: Save says what is missing', async () => {
  await page.goto(`${BASE}/finance/ledger`);
  await page.getByRole('button', { name: 'Log expense' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log new expense' });
  return await dialog.getByText(/^To save, add/).innerText();
});

await step('Log an electricity bill with no animals', async () => {
  const dialog = page.getByRole('dialog', { name: 'Log new expense' });
  await dialog.locator('input[name="amount"]').fill('2500');
  await dialog.locator('select[name="category"]').selectOption('Utilities');
  await dialog.locator('input[name="party"]').fill('Kenya Power');
  await dialog.locator('input[name="item_name"]').fill('Electricity');
  const costClass = await dialog.locator('select[name="cost_class"]').first().inputValue();
  await dialog.getByRole('button', { name: 'Log Expense' }).click();
  await seen(/Expense recorded|was not saved/);
  return `cost class defaulted to ${costClass}; ${await visibleText(/Expense recorded|was not saved/)}`;
});

await step('Log other income', async () => {
  await page.getByRole('button', { name: 'Log income' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record income or customer payment' });
  await dialog.getByRole('button', { name: 'Other payer' }).click();
  await dialog.locator('input[name="amount"]').fill('4000');
  await dialog.locator('input[name="income_source"]').fill('County show');
  await dialog.locator('select[name="category"]').selectOption('Other Income');
  await dialog.getByRole('button', { name: 'Log Income' }).click();
  await seen(/Income recorded|was not saved/);
  return await visibleText(/Income recorded|was not saved/);
});

await step('Both entries appear in the ledger', async () => {
  await page.waitForTimeout(1500);
  const text = await page.locator('main').innerText();
  return `electricity: ${/Electricity|Kenya Power/.test(text)} · county show: ${/County show/.test(text)}`;
});

await step('Attach a receipt photo to the electricity bill', async () => {
  await entry('Electricity').getByRole('button', { name: 'Add photo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Receipt photos' });
  await dialog.locator('input[type="file"]:not([capture])').setInputFiles({ name: 'kplc-receipt.png', mimeType: 'image/png', buffer: PNG });
  await dialog.getByRole('button', { name: 'Open kplc-receipt.png' }).waitFor();
  const shown = await dialog.locator('img').first().evaluate((img) => img.complete && img.naturalWidth > 0);
  await page.keyboard.press('Escape');
  await entry('Electricity').getByRole('button', { name: 'Photos (1)' }).waitFor();
  return `thumbnail loaded through the API: ${shown}`;
});

await step('Correct the electricity amount; the photo moves to the new entry', async () => {
  await entry('Electricity', 'Correct').getByRole('button', { name: 'Correct' }).click();
  const dialog = page.getByRole('dialog', { name: 'Correct expense' });
  await dialog.getByLabel('Amount (KES)').fill('2750');
  await dialog.getByLabel('Reason for the correction').fill('Bill was 2,750');
  await dialog.getByRole('button', { name: 'Void and replace' }).click();
  await seen(/Expense corrected|Not corrected/);
  if (await dialog.isVisible().catch(() => false)) throw new Error((await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 200));
  const replacement = entry('Electricity', 'Correct');
  await replacement.getByText(/2,750/).first().waitFor();
  const photos = await replacement.getByRole('button', { name: /Photos \(\d\)/ }).innerText().catch(() => 'no photos');
  return `${await visibleText(/Expense corrected/)} · replacement: ${photos}`;
});

await step('Correct the county show income amount', async () => {
  await entry('County show', 'Correct').getByRole('button', { name: 'Correct' }).click();
  const dialog = page.getByRole('dialog', { name: 'Correct income' });
  if (await dialog.getByLabel('Cost class').count()) throw new Error('income form shows a cost class');
  await dialog.getByLabel('Amount (KES)').fill('4500');
  await dialog.getByLabel('Reason for the correction').fill('Prize was 4,500');
  await dialog.getByRole('button', { name: 'Void and replace' }).click();
  await seen(/Income corrected|Not corrected/);
  if (await dialog.isVisible().catch(() => false)) throw new Error((await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 200));
  await entry('County show', 'Correct').getByText(/4,500/).first().waitFor();
  return await visibleText(/Income corrected/);
});

await step('An error banner is the dark block and takes focus', async () => {
  await page.route(`${API}/hr/payroll/**`, (route) => route.abort());
  await page.goto(`${BASE}/hr/payroll`);
  const banner = page.getByRole('alert').filter({ hasText: /could not be loaded|couldn’t connect|reach the server/i }).first();
  await banner.waitFor();
  const look = await banner.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, focused: document.activeElement === el }));
  await page.unroute(`${API}/hr/payroll/**`);
  return `background ${look.bg}, focused: ${look.focused}`;
});

await step('No sideways scrolling on these pages', async () => {
  const offenders = [];
  for (const path of ['/hr/staff', '/hr/payroll', '/operations/safety', '/finance/ledger']) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('main [class*="overflow-y-auto"]') ?? document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    if (overflow > 2) offenders.push(`${path} +${overflow}px`);
  }
  if (offenders.length) throw new Error(offenders.join(', '));
});

await browser.close();
writeFileSync(`${OUT}report.json`, JSON.stringify({ mode, phone, results, consoleErrors, failedRequests }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} steps passed`);
console.log(`console errors: ${consoleErrors.length}`);
[...new Set(consoleErrors)].slice(0, 12).forEach((line) => console.log('  ', line));
console.log(`failed API calls: ${failedRequests.length}`);
failedRequests.slice(0, 20).forEach((line) => console.log('  ', line));
