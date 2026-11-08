import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MilkSafetyBoard from '../SafetyDashboard';
import { daysUntilClear, formatLockExpiry, normalizeHardlock, normalizeSeverity, readHardlockPage } from '../../../lib/milkSafety';
import { isReplayableMutation } from '../../../lib/offlinePolicy';
import { todayLocalIso } from '../../../lib/localDate';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({ hardlockPage: vi.fn(), setHardlock: vi.fn(), placeHold: vi.fn(), recordMilkTest: vi.fn(), milkTests: vi.fn() }));
const herd = vi.hoisted(() => ({ cows: [] }));
const auth = vi.hoisted(() => ({ currentUser: { id: 1, role: 'FARMER' } }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({
  ...(await importOriginal()),
  safetyApi: api,
  herdApi: { list: () => Promise.resolve(herd.cows) },
}));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const inDays = (days) => todayLocalIso(new Date(Date.now() + days * 86_400_000));
const lock = (overrides) => ({ cow_id: 3, cow_name: 'Neema', cow_tag: 'KE-003', severity: 'high', reason: 'Mastitis', lock_expires: inDays(5), medication: 'Penicillin', updated_by: 7, notes: null, ...overrides });

const renderBoard = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><MilkSafetyBoard /></MemoryRouter>
  </QueryClientProvider>,
);

describe('milk safety data', () => {
  it('reads the backend’s severity scale, and older labels', () => {
    expect(normalizeSeverity('high')).toBe('high');
    expect(normalizeSeverity('critical')).toBe('high');
    expect(normalizeSeverity('WARNING')).toBe('medium');
    expect(normalizeSeverity('unknown')).toBeNull();
  });

  it('never invents values the backend didn’t send', () => {
    expect(normalizeHardlock({ cow_id: 3, severity: 'low' })).toMatchObject({ medication: null, reason: null, notes: null, lockExpires: null });
  });

  it('reads the paginated payload with its total', () => {
    expect(readHardlockPage({ items: [lock()], meta: { total: 34 } })).toMatchObject({ total: 34 });
    expect(readHardlockPage([lock()]).total).toBe(1);
  });

  it('counts days until the milk can be sold', () => {
    expect(daysUntilClear(inDays(5))).toBe(5);
    expect(daysUntilClear(inDays(-1))).toBe(0);
    expect(daysUntilClear(null)).toBeNull();
    expect(formatLockExpiry('not-a-date')).toBeNull();
  });

  it('never queues a milk release offline', () => {
    expect(isReplayableMutation({ method: 'put', url: '/cows/3/hardlock' })).toBe(false);
  });
});

describe('MilkSafetyBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { id: 1, role: 'FARMER' };
    api.setHardlock.mockResolvedValue({});
    herd.cows = [];
  });

  it('says plainly when no cow is on withdrawal', async () => {
    api.hardlockPage.mockResolvedValue({ items: [], meta: { total: 0 } });
    renderBoard();
    expect(await screen.findByText('No cows on milk withdrawal')).toBeTruthy();
    expect(screen.queryByText(/match/)).toBeNull();
  });

  it('counts by the backend’s severity and shows when the milk clears', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock(), lock({ cow_id: 4, cow_name: 'Zawadi', severity: 'medium', lock_expires: inDays(-1) })], meta: { total: 2 } });
    renderBoard();
    expect(await screen.findByText('Keep milk from 2 cows apart')).toBeTruthy();
    expect(screen.getByText('in 5 days')).toBeTruthy();
    expect(screen.getByText('Withdrawal period over')).toBeTruthy();
    const summary = screen.getByRole('region', { name: /Keep milk from 2 cows apart/ });
    expect(within(summary).getAllByText('1')).toHaveLength(2);
  });

  it('releases with a simple confirm when the backend says it can', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock({ withdrawal_active: false, can_release: true, lock_expires: inDays(-1) })], meta: { total: 1 } });
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Release milk' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Release milk' }));
    await waitFor(() => expect(api.setHardlock).toHaveBeenCalledWith(3, false, { overrideReason: undefined }));
  });

  it('asks for an audited reason to release during a withdrawal', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock({ withdrawal_active: true, can_release: false, withdrawal_ends_at: `${inDays(5)}T06:00:00+03:00`, vet_name: 'Dr Achieng' })], meta: { total: 1 } });
    renderBoard();
    expect(await screen.findByText('Treated by Dr Achieng')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Release milk' }));
    const dialog = await screen.findByRole('dialog', { name: /Release Neema.*milk early\?/ });
    const submit = within(dialog).getByRole('button', { name: 'Release early' });
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Why is it safe to release now?'), { target: { value: 'Delvotest negative' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.setHardlock).toHaveBeenCalledWith(3, false, { overrideReason: 'Delvotest negative' }));
  });

  it('switches to the reason form when the backend refuses with WITHDRAWAL_ACTIVE', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock({ can_release: true })], meta: { total: 1 } });
    api.setHardlock.mockRejectedValueOnce(Object.assign(new Error('409'), {
      response: { status: 409, data: { code: 'WITHDRAWAL_ACTIVE', error: 'Withdrawal running', withdrawal_ends_at: `${inDays(2)}T06:00:00+03:00` }, headers: {} },
    }));
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Release milk' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Release milk' }));
    expect(await screen.findByLabelText('Why is it safe to release now?')).toBeTruthy();
  });

  it('lets only owners release milk', async () => {
    auth.currentUser = { id: 2, role: 'FARM_HAND' };
    api.hardlockPage.mockResolvedValue({ items: [lock()], meta: { total: 1 } });
    renderBoard();
    await screen.findByText('Mastitis');
    expect(screen.queryByRole('button', { name: 'Release milk' })).toBeNull();
  });

  it('lets a farm hand hold a cow’s milk, with the backend’s fields', async () => {
    auth.currentUser = { id: 2, role: 'FARM_HAND' };
    herd.cows = [{ id: 12, name: 'Zawadi', earTag: 'KE-012' }];
    api.hardlockPage.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.placeHold.mockResolvedValue({});
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Hold a cow’s milk' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: /Zawadi/ });
    const submit = within(dialog).getByRole('button', { name: 'Hold her milk' });
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Cow'), { target: { value: '12' } });
    fireEvent.change(within(dialog).getByLabelText('Why hold her milk?'), { target: { value: 'Blood in milk' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.placeHold).toHaveBeenCalledWith({ cowId: 12, reason: 'Blood in milk', until: null, notes: null }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Zawadi.*on hold/));
  });

  it('keeps the form open with the backend’s reason when a hold is refused', async () => {
    herd.cows = [{ id: 12, name: 'Zawadi' }];
    api.hardlockPage.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.placeHold.mockRejectedValue(Object.assign(new Error('422'), { response: { status: 422, data: { code: 'VALIDATION_ERROR', error: 'until must be in the future.' }, headers: {} } }));
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Hold a cow’s milk' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: /Zawadi/ });
    fireEvent.change(within(dialog).getByLabelText('Cow'), { target: { value: '12' } });
    fireEvent.change(within(dialog).getByLabelText('Why hold her milk?'), { target: { value: 'Smell' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hold her milk' }));
    expect(await within(dialog).findByText('until must be in the future.')).toBeTruthy();
  });

  it('records a failed milk test from a cow’s card and says her milk is held', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock()], meta: { total: 1 } });
    api.recordMilkTest.mockResolvedValue({ test: { id: 1 }, placedOnHold: true, hold: {} });
    renderBoard();
    await screen.findByText('Mastitis');
    const card = screen.getByRole('heading', { name: /Neema/ }).closest('article');
    fireEvent.click(within(card).getByRole('button', { name: 'Record milk test' }));
    const dialog = await screen.findByRole('dialog', { name: /Milk test for Neema/ });
    expect(within(dialog).queryByLabelText('Cow')).toBeNull();
    fireEvent.click(within(dialog).getByLabelText('Failed'));
    expect(within(dialog).getByText(/puts her milk on hold straight away/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save test' }));
    await waitFor(() => expect(api.recordMilkTest).toHaveBeenCalledWith(expect.objectContaining({ cowId: 3, testType: 'Antibiotic residue', result: 'FAIL' })));
    expect(api.recordMilkTest.mock.calls[0][0].testedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Test failed.*now on hold/));
  });

  it('shows a cow’s milk tests with who recorded them', async () => {
    api.hardlockPage.mockResolvedValue({ items: [lock()], meta: { total: 1 } });
    api.milkTests.mockResolvedValue([{ id: 9, tested_at: '2026-11-03T07:30:00+03:00', test_type: 'Antibiotic residue', result: 'PASS', notes: 'Delvotest', recorded_by_name: 'Achieng' }]);
    renderBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Milk tests' }));
    expect(await screen.findByText(/by Achieng/)).toBeTruthy();
    expect(api.milkTests).toHaveBeenCalledWith(3);
  });

  it('says what it couldn’t load instead of showing an empty board', async () => {
    api.hardlockPage.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    renderBoard();
    expect(await screen.findByText(/Couldn’t load the safety list/)).toBeTruthy();
    expect(screen.queryByText('No cows on milk withdrawal')).toBeNull();
  });
});
