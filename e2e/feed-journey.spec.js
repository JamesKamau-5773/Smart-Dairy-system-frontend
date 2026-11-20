// Smoke journey: a new farm owner sets up feed stock, mixes, and sees today's
// feeding, on a phone. Runs against the in-browser mock (phone-mocked) or a real
// backend (phone-full-stack, E2E_FULL_STACK=1). It creates its own farm and data,
// so it needs no seed and works on any database.
import { expect, test } from '@playwright/test';
import { installMockBackend } from './support/mockBackend.js';

const FULL_STACK = process.env.E2E_FULL_STACK === '1';

// A unique Kenyan mobile number per run, so a shared database never collides.
const uniquePhone = () => `07${String(Date.now()).slice(-8)}`;

test('feed setup journey on a phone', async ({ page }) => {
  const mock = FULL_STACK ? null : await installMockBackend(page);
  const phone = uniquePhone();
  const farm = `E2E Farm ${phone.slice(-4)}`;
  const itemCard = (name) => page.getByRole('heading', { name }).first().locator('xpath=ancestor::article');

  await test.step('register a farm', async () => {
    await page.goto('/register');
    await page.getByLabel('Farm name').fill(farm);
    await page.getByLabel('Phone number').fill(phone);
    await page.getByLabel('Password', { exact: true }).fill(`Maziwa${phone.slice(-4)}a`);
    await page.getByRole('button', { name: /Create farm account/ }).click();
    await expect(page).not.toHaveURL(/\/register/);
  });

  await test.step('add a feed item without a SKU', async () => {
    await page.goto('/operations/inventory');
    await page.getByRole('button', { name: /Add to feedstore|Register your first item/i }).first().click();
    const dialog = page.getByRole('dialog').last();
    await dialog.locator('input[name="name"]').fill('Maize Germ');
    await dialog.locator('input[name="currentStock"]').fill('200');
    await dialog.locator('input[name="proteinGramsPerKg"]').fill('10');
    await dialog.locator('input[name="energyMjPerKg"]').fill('12');
    await dialog.locator('input[name="costPerKg"]').fill('32');
    await dialog.getByRole('button', { name: /Save resource/i }).click();
    await expect(itemCard('Maize Germ')).toBeVisible();
  });

  await test.step('restock a decimal amount; the ledger option needs a price', async () => {
    await itemCard('Maize Germ').getByRole('button', { name: 'Restock' }).click();
    const dialog = page.getByRole('dialog', { name: 'Restock resource' });
    await dialog.getByLabel(/Quantity delivered/).fill('23.5');
    await dialog.getByLabel(/Also record this purchase/).check();
    await dialog.getByRole('button', { name: /Confirm delivery/i }).click();
    await expect(dialog.getByText('Enter the price per kg to record the expense.')).toBeVisible();
    await dialog.getByLabel(/Price paid per kg/).fill('34');
    await dialog.getByLabel(/Supplier/).fill('Unga Feeds');
    await dialog.getByRole('button', { name: /Confirm delivery/i }).click();
    await expect(itemCard('Maize Germ')).toContainText('223.5');
  });

  await test.step('write off spoiled stock', async () => {
    await itemCard('Maize Germ').getByRole('button', { name: 'Use / write off' }).click();
    const dialog = page.getByRole('dialog', { name: 'Take stock out' });
    await dialog.getByLabel('Reason').selectOption('SPOILAGE');
    await dialog.getByLabel(/Quantity taken out/).fill('3.5');
    await dialog.getByRole('button', { name: 'Record' }).click();
    await expect(itemCard('Maize Germ')).toContainText('220');
  });

  await test.step('shares must add up to 100% before a mix is saved', async () => {
    await page.goto('/feed-nutrition/mix');
    const share = page.getByLabel('Maize Germ percentage');
    await share.fill('90');
    await expect(page.getByRole('button', { name: /Save as current feed mix/i })).toBeDisabled();
    await expect(page.getByText(/Change them to exactly 100% first/).first()).toBeVisible();

    // A real backend may list other ingredients for a new farm; give them 0%.
    const shares = page.getByLabel(/ percentage$/);
    for (let index = 0; index < await shares.count(); index += 1) await shares.nth(index).fill('0');
    await share.fill('100');
    await page.getByLabel('Use this mix for').selectOption('lactating');
    await page.getByLabel('Concentrate per cow per day (kg)').fill('4');
    await page.getByRole('button', { name: /Save as current feed mix/i }).click();
    await expect(page.getByText('Mix saved as the current feed mix.')).toBeVisible();
  });

  await test.step('the dashboard shows one card per mix type', async () => {
    await page.goto('/feed-nutrition');
    await expect(page.getByRole('region', { name: 'Dairy meal' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Main feed' })).toBeVisible();
  });

  await test.step('today’s feeding loads without prices and says why a group isn’t ready', async () => {
    await page.goto('/feeding');
    await expect(page.getByRole('heading', { name: /Today.s Feeding/ })).toBeVisible();
    const lactating = page.getByRole('heading', { name: 'Lactating cows' }).locator('xpath=ancestor::article');
    await expect(lactating).toBeVisible();
    // No batch has been mixed in this journey, so the backend reports why it can't be fed yet.
    await expect(lactating.getByText('Not ready to feed from this plan')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('KES');
  });

  if (mock) expect(mock.unhandled.filter((call) => /inventory|nutrition|auth/.test(call))).toEqual([]);
});
