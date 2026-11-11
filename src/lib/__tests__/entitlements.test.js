import { describe, expect, it } from 'vitest';
import { featureAccess, limitFor, normalizeEntitlements } from '../entitlements';
import { isFeatureEnabled } from '../featureFlags';
import { getPlanErrorMessage } from '../apiErrors';
import { getApiErrorMessage } from '../backendApi';
import { RECEIPT_MAX_BYTES, RECEIPT_MAX_PER_ENTRY, receiptLimits } from '../receiptAttachments';

const raw = {
  plan: { id: 'starter', name: 'Starter' },
  is_demo: false,
  features: ['milk_records', 'herd'],
  limits: { cows: 50, receipt_upload_max_bytes: 2097152, staff_accounts: null },
  usage: { cows: '42' },
  upgrade_url: 'https://maziwasmart.co.ke/plans',
};

describe('normalizeEntitlements', () => {
  it('reads what the backend sends', () => {
    const entitlements = normalizeEntitlements(raw);
    expect(entitlements.known).toBe(true);
    expect(entitlements.plan).toEqual({ id: 'starter', name: 'Starter' });
    expect(entitlements.isDemo).toBe(false);
    expect([...entitlements.features]).toEqual(['milk_records', 'herd']);
    expect(entitlements.limits).toEqual({ cows: 50, receipt_upload_max_bytes: 2097152, staff_accounts: null });
    expect(entitlements.usage).toEqual({ cows: 42 });
    expect(entitlements.upgradeUrl).toBe('https://maziwasmart.co.ke/plans');
  });

  it('assumes nothing when the backend sends nothing', () => {
    expect(normalizeEntitlements(undefined)).toEqual({
      known: false, plan: null, isDemo: null, features: null, limits: {}, usage: {}, upgradeUrl: null,
    });
  });

  it('ignores an upgrade link that isn’t https', () => {
    expect(normalizeEntitlements({ ...raw, upgrade_url: 'javascript:alert(1)' }).upgradeUrl).toBeNull();
    expect(normalizeEntitlements({ ...raw, upgrade_url: 'http://example.com' }).upgradeUrl).toBeNull();
  });
});

describe('featureAccess and limitFor', () => {
  it('locks only features the backend left out of the plan', () => {
    const entitlements = normalizeEntitlements(raw);
    expect(featureAccess(entitlements, 'herd')).toBe('enabled');
    expect(featureAccess(entitlements, 'payroll')).toBe('locked');
  });

  it('is unknown (not locked) while the plan is unknown', () => {
    expect(featureAccess(normalizeEntitlements(undefined), 'payroll')).toBe('unknown');
    expect(featureAccess(normalizeEntitlements({ plan: { id: 'x' } }), 'payroll')).toBe('unknown');
  });

  it('returns limits, or null when unknown', () => {
    const entitlements = normalizeEntitlements(raw);
    expect(limitFor(entitlements, 'cows')).toBe(50);
    expect(limitFor(entitlements, 'staff_accounts')).toBeNull();
    expect(limitFor(entitlements, 'buyers')).toBeNull();
  });
});

describe('isFeatureEnabled', () => {
  it('defaults plan indicators on, and can switch them off', () => {
    expect(isFeatureEnabled('planIndicators', {})).toBe(true);
    expect(isFeatureEnabled('planIndicators', { VITE_FEATURE_PLAN_INDICATORS: 'false' })).toBe(false);
    expect(isFeatureEnabled('planIndicators', { VITE_FEATURE_PLAN_INDICATORS: '0' })).toBe(false);
    expect(isFeatureEnabled('planIndicators', { VITE_FEATURE_PLAN_INDICATORS: 'true' })).toBe(true);
    expect(isFeatureEnabled('notAFlag', {})).toBe(false);
    // Off until the backend can delete customers (BR-007).
    expect(isFeatureEnabled('customerDelete', {})).toBe(false);
    expect(isFeatureEnabled('customerDelete', { VITE_FEATURE_CUSTOMER_DELETE: 'true' })).toBe(true);
    // Off until statement links use private tokens (BR-016).
    expect(isFeatureEnabled('customerPortal', {})).toBe(false);
    // The language switch is on unless switched off.
    expect(isFeatureEnabled('kiswahili', {})).toBe(true);
    expect(isFeatureEnabled('kiswahili', { VITE_FEATURE_KISWAHILI: 'false' })).toBe(false);
  });
});

describe('plan and demo error messages', () => {
  const refusal = (status, code, extra = {}) => ({ response: { status, data: { code, error: 'raw backend text', ...extra } } });

  it.each([
    [402, 'FEATURE_NOT_IN_PLAN', /isn’t included in your plan/],
    [402, 'SUBSCRIPTION_EXPIRED', /subscription has ended/],
    [403, 'DEMO_READ_ONLY', /demo farm/],
    [402, 'PLAN_LIMIT_REACHED', /limit for this has been reached/],
  ])('%s %s → a clear message', (status, code, expected) => {
    expect(getPlanErrorMessage(refusal(status, code))).toMatch(expected);
    // Every page gets it through the shared message path.
    expect(getApiErrorMessage(refusal(status, code), 'fallback')).toMatch(expected);
  });

  it('names the limit when the backend says which', () => {
    expect(getPlanErrorMessage(refusal(402, 'PLAN_LIMIT_REACHED', { limit: 50, resource: 'cows' })))
      .toBe('Your plan allows 50 cows. Upgrade your plan to add more. Nothing you already saved is affected.');
  });

  it('leaves other errors alone', () => {
    expect(getPlanErrorMessage(refusal(403, 'FORBIDDEN'))).toBeNull();
    expect(getPlanErrorMessage(refusal(500, 'DEMO_READ_ONLY'))).toBeNull();
    expect(getPlanErrorMessage(new Error('x'))).toBeNull();
  });
});

describe('receiptLimits', () => {
  it('uses the backend’s limits when it sends them', () => {
    const entitlements = { limit: (key) => ({ receipt_upload_max_bytes: 2097152, receipts_per_entry: 3 })[key] ?? null };
    expect(receiptLimits(entitlements)).toEqual({ maxBytes: 2097152, maxPerEntry: 3 });
  });

  it('falls back to the documented defaults until then', () => {
    expect(receiptLimits({ limit: () => null })).toEqual({ maxBytes: RECEIPT_MAX_BYTES, maxPerEntry: RECEIPT_MAX_PER_ENTRY });
    expect(receiptLimits(undefined)).toEqual({ maxBytes: RECEIPT_MAX_BYTES, maxPerEntry: RECEIPT_MAX_PER_ENTRY });
  });
});
