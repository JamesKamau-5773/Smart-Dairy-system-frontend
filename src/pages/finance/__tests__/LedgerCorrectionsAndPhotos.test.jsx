import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;

const api = vi.hoisted(() => ({
  listLedgerEntries: vi.fn(),
  correctTransaction: vi.fn(),
  categories: vi.fn(),
  uploadAttachment: vi.fn(),
  fetchAttachment: vi.fn(),
}));
const auth = vi.hoisted(() => ({ currentUser: { role: 'FARMER' } }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../lib/backendApi', () => ({
  financeApi: api,
  herdApi: { list: () => Promise.resolve([]) },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.error || fallback || 'Request failed',
}));

import FinancialLedger from '../FinancialLedger';

const row = (overrides) => ({
  id: 1, date: '2026-11-02', status: 'POSTED', amount: 1200, reference_code: 'EXP-1', attachments: [], ...overrides,
});
const expense = row({ id: 1, transaction_type: 'Expense', category: 'Transport', transaction_category: 'Transport', cost_class: 'OPERATING', item_name: 'Boda to town' });
const otherIncome = row({ id: 2, transaction_type: 'Revenue', category: 'Other Income', transaction_category: 'Other Income', amount: 5000, item_name: 'County show prize' });
const customerIncome = row({ id: 3, transaction_type: 'Revenue', category: 'Milk Sale', transaction_category: 'Milk Sale', amount: 800, customer_id: 4, customer_name: 'Auntie' });

const categories = {
  revenue: [{ value: 'Milk Sale', label: 'Milk Sale' }, { value: 'Other Income', label: 'Other Income' }],
  expense: [{ value: 'Transport', label: 'Transport', default_cost_class: 'OPERATING' }],
  cost_classes: [{ value: 'COGS', label: 'Production cost' }, { value: 'OPERATING', label: 'Running cost' }],
};

const renderLedger = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <FinancialLedger />
  </QueryClientProvider>,
);
// The phone card list repeats each action; the table is the first copy.
const tableRow = async (text) => (await screen.findAllByText(text))[0].closest('tr');
// Row actions live in the ⋮ menu.
const openRowMenu = async (text) => {
  fireEvent.click(within(await tableRow(text)).getByRole('button', { name: /^Actions for/ }));
  return screen.findByRole('menu');
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  auth.currentUser = { role: 'FARMER' };
  api.categories.mockResolvedValue(categories);
  api.listLedgerEntries.mockResolvedValue({ items: [expense, otherIncome, customerIncome], meta: { total: 3 }, summary: {} });
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:receipt');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('ledger corrections', () => {
  it('offers to correct expenses and unlinked income, not customer income', async () => {
    renderLedger();
    expect(within(await openRowMenu('Boda to town')).getByRole('menuitem', { name: 'Correct' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(within(await openRowMenu('County show prize')).getByRole('menuitem', { name: 'Correct' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(within(await openRowMenu('Auntie')).queryByRole('menuitem', { name: 'Correct' })).toBeNull();
  });

  it('corrects an amount and sends only what changed', async () => {
    api.correctTransaction.mockResolvedValue({});
    renderLedger();
    fireEvent.click(within(await openRowMenu('Boda to town')).getByRole('menuitem', { name: 'Correct' }));
    const dialog = await screen.findByRole('dialog', { name: 'Correct expense' });
    const submit = within(dialog).getByRole('button', { name: 'Void and replace' });
    fireEvent.change(within(dialog).getByLabelText('Amount (KES)'), { target: { value: '1500' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Reason for the correction'), { target: { value: 'Typed 1200 instead of 1500' } });
    fireEvent.click(submit);
    await waitFor(() => expect(api.correctTransaction).toHaveBeenCalledWith(1, {
      void_reason: 'Typed 1200 instead of 1500',
      replacement: { cost_class: 'OPERATING', amount: 1500 },
    }));
  });

  it('corrects income without a cost class and keeps the backend’s refusal in the form', async () => {
    api.correctTransaction.mockRejectedValue(Object.assign(new Error('422'), {
      response: { status: 422, data: { error: 'This entry was posted automatically (stock, payroll or advances). Correct the amount at its source.' } },
    }));
    renderLedger();
    fireEvent.click(within(await openRowMenu('County show prize')).getByRole('menuitem', { name: 'Correct' }));
    const dialog = await screen.findByRole('dialog', { name: 'Correct income' });
    expect(within(dialog).queryByLabelText('Cost class')).toBeNull();
    expect(within(dialog).getByText(/its receipt are voided/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Amount (KES)'), { target: { value: '4500' } });
    fireEvent.change(within(dialog).getByLabelText('Reason for the correction'), { target: { value: 'Prize was 4,500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Void and replace' }));
    await waitFor(() => expect(api.correctTransaction).toHaveBeenCalledWith(2, { void_reason: 'Prize was 4,500', replacement: { amount: 4500 } }));
    expect(await within(dialog).findByText(/Correct the amount at its source/)).toBeTruthy();
  });
});

describe('receipt photos', () => {
  it('shows saved receipts fetched with the login, and uploads a new one', async () => {
    api.listLedgerEntries.mockResolvedValue({
      items: [{ ...expense, attachments: [{ id: 7, url: '/api/finance/transactions/1/attachments/7', content_type: 'application/pdf', filename: 'invoice.pdf' }] }],
      meta: { total: 1 },
      summary: {},
    });
    api.fetchAttachment.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    api.uploadAttachment.mockResolvedValue({ id: 8, url: '/api/finance/transactions/1/attachments/8', content_type: 'application/pdf', filename: 'second.pdf' });
    renderLedger();
    // The paperclip in the row opens the saved photos.
    fireEvent.click(within(await tableRow('Boda to town')).getByRole('button', { name: 'Receipt photos (1)' }));
    const dialog = await screen.findByRole('dialog', { name: 'Receipt photos' });
    expect(await within(dialog).findByRole('button', { name: 'Open invoice.pdf' })).toBeTruthy();
    expect(api.fetchAttachment).toHaveBeenCalledWith('/api/finance/transactions/1/attachments/7');

    const fileInput = dialog.querySelector('input[type="file"]:not([capture])');
    fireEvent.change(fileInput, { target: { files: [new File(['%PDF'], 'second.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(api.uploadAttachment).toHaveBeenCalledWith(1, expect.any(File), expect.any(Object)));
    expect(await within(dialog).findByRole('button', { name: 'Open second.pdf' })).toBeTruthy();
  });

  it('says why a file was refused without sending it', async () => {
    renderLedger();
    expect(within(await tableRow('Boda to town')).getByRole('button', { name: 'Add receipt photo' })).toBeTruthy();
    fireEvent.click(within(await openRowMenu('Boda to town')).getByRole('menuitem', { name: 'Add photo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Receipt photos' });
    fireEvent.change(dialog.querySelector('input[type="file"]:not([capture])'), { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(await within(dialog).findByText(/photo .* or a PDF/)).toBeTruthy();
    expect(api.uploadAttachment).not.toHaveBeenCalled();
  });
});
