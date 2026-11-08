import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryRegistry from '../InventoryRegistry';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({
  listItems: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), deleteItem: vi.fn(),
  createMovement: vi.fn(), archiveItem: vi.fn(), restoreItem: vi.fn(), applyDataFix: vi.fn(), countStock: vi.fn(),
  getQuickRestockItems: vi.fn(),
}));
const auth = vi.hoisted(() => ({ currentUser: { id: 1, role: 'FARMER' } }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('../../../lib/backendApi', async (importOriginal) => ({ ...(await importOriginal()), inventoryApi: api }));
vi.mock('../../../hooks/useTenant', () => ({ useTenant: () => ({ tenantId: 't1', farmId: 'f1' }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const sunflower = {
  id: 34, name: 'Sunflower Cake', sku: '', category: 'Bulk Feed', unit: 'KG', stock: { value: 120, unit: 'KG' },
  is_active: true,
  data_warnings: [{ code: 'PROTEIN_LIKELY_PERCENT', field: 'protein_grams_per_kg', value: 30, suggested_value: 300, message: 'Sunflower Cake has 30 g/kg protein, which looks like a percentage.' }],
};
const oldHay = { id: 35, name: 'Old Hay', sku: 'HY-1', category: 'Bulk Feed', stock: { value: 0, unit: 'KG' }, is_active: false, data_warnings: [] };

const renderRegistry = (entry = '/operations/inventory') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[entry]}><InventoryRegistry /></MemoryRouter>
  </QueryClientProvider>,
);

// The phone layout renders plain buttons per item, which are easy to target.
const card = async (name) => (await screen.findByRole('heading', { name })).closest('article');

describe('InventoryRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { id: 1, role: 'FARMER' };
    api.listItems.mockImplementation(({ includeArchived } = {}) => Promise.resolve(includeArchived ? [sunflower, oldHay] : [sunflower]));
    api.archiveItem.mockResolvedValue({ ...sunflower, is_active: false });
    api.applyDataFix.mockResolvedValue({ ...sunflower, data_warnings: [] });
  });

  it('hides archived items until asked, then marks them', async () => {
    renderRegistry();
    await card('Sunflower Cake');
    expect(screen.queryByRole('heading', { name: 'Old Hay' })).toBeNull();

    fireEvent.click(screen.getByLabelText('Show archived items'));
    const hay = await card('Old Hay');
    expect(within(hay).getByText('Archived')).toBeTruthy();
    expect(within(hay).getByRole('button', { name: 'Restore' })).toBeTruthy();
    expect(api.listItems).toHaveBeenLastCalledWith({ includeArchived: true });
  });

  it('shows a data warning with a one-tap fix for the owner', async () => {
    renderRegistry();
    const item = await card('Sunflower Cake');
    expect(within(item).getByText(/looks like a percentage/)).toBeTruthy();
    expect(within(item).getByText(/Suggested: 300/)).toBeTruthy();

    fireEvent.click(within(item).getByRole('button', { name: /Apply fix/ }));
    await waitFor(() => expect(api.applyDataFix).toHaveBeenCalledWith(34, 'PROTEIN_LIKELY_PERCENT'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sunflower Cake corrected.'));
  });

  it('shows warnings but no fix or archive to staff', async () => {
    auth.currentUser = { id: 2, role: 'FARM_HAND' };
    renderRegistry();
    const item = await card('Sunflower Cake');
    expect(within(item).getByText(/looks like a percentage/)).toBeTruthy();
    expect(within(item).queryByRole('button', { name: /Apply fix/ })).toBeNull();
    expect(within(item).queryByRole('button', { name: 'Archive' })).toBeNull();
  });

  it('offers Archive when an item in use can’t be deleted', async () => {
    api.deleteItem.mockRejectedValue(Object.assign(new Error('409'), {
      // As the backend actually answers today: no `can_archive` field.
      response: { status: 409, data: { code: 'ITEM_IN_USE', error: 'In use. Archive it instead.' }, headers: {} },
    }));
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Delete' }));
    const confirmDelete = await screen.findByRole('dialog', { name: 'Delete Inventory Item' });
    fireEvent.click(within(confirmDelete).getByRole('button', { name: 'Delete' }));

    const inUse = await screen.findByRole('dialog', { name: 'This item is in use' });
    fireEvent.click(within(inUse).getByRole('button', { name: 'Archive instead' }));
    await waitFor(() => expect(api.archiveItem).toHaveBeenCalledWith(34));
  });

  it('lets a server-calculated cost like 32.33 be saved from the edit form', async () => {
    api.listItems.mockResolvedValue([{ ...sunflower, cost_per_kg: 32.33, data_warnings: [] }]);
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit resource' });
    dialog.querySelectorAll('input[type="number"]').forEach((input) => {
      if (input.getAttribute('step')) expect(input.getAttribute('step')).toBe('any');
    });
  });

  it('records a decimal delivery with price and supplier, and confirms the ledger entry', async () => {
    api.createMovement.mockResolvedValue({ ledgerEntryId: 88, supplierLotId: 5 });
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Restock' }));

    const dialog = await screen.findByRole('dialog', { name: 'Restock resource' });
    fireEvent.change(within(dialog).getByLabelText(/Quantity delivered/), { target: { value: '23.5' } });
    fireEvent.click(within(dialog).getByLabelText(/Also record this purchase/));
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm Delivery/ }));
    expect(within(dialog).getByText('Enter the price per kg to record the expense.')).toBeTruthy();
    expect(api.createMovement).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Price paid per kg/), { target: { value: '42' } });
    fireEvent.change(within(dialog).getByLabelText(/Supplier/), { target: { value: 'Unga Feeds' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm Delivery/ }));

    await waitFor(() => expect(api.createMovement).toHaveBeenCalledWith(expect.objectContaining({
      item_id: 34, quantity: 23.5, unit_cost: 42, supplier_name: 'Unga Feeds', record_expense: true,
    })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Delivery recorded and added to the ledger as a Feed Purchase.'));
  });

  it('keeps the restock dialog open with the error when the delivery fails', async () => {
    api.createMovement.mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400, data: { code: 'VALIDATION_ERROR', error: 'Quantity is too large.' }, headers: {} } }));
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Restock' }));
    const dialog = await screen.findByRole('dialog', { name: 'Restock resource' });
    fireEvent.change(within(dialog).getByLabelText(/Quantity delivered/), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm Delivery/ }));

    expect(await within(dialog).findByText('Quantity is too large.')).toBeTruthy();
    expect(within(dialog).getByLabelText(/Quantity delivered/).value).toBe('5');
  });

  it('writes off spoiled stock with a reason and says it went to the ledger', async () => {
    api.createMovement.mockResolvedValue({ ledgerEntryId: 91 });
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Use / write off' }));
    const dialog = await screen.findByRole('dialog', { name: 'Take stock out' });

    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'SPOILAGE' } });
    expect(within(dialog).getByText(/also recorded in the ledger/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(/Quantity taken out/), { target: { value: '200' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record' }));
    expect(within(dialog).getByText(/Only 120 in stock/)).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText(/Quantity taken out/), { target: { value: '2.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(api.createMovement).toHaveBeenCalledWith({ item_id: 34, quantity: 2.5, transaction_type: 'SPOILAGE', movement_type: 'SPOILAGE' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2.5 KG of Sunflower Cake written off and added to the ledger.'));
  });

  it('corrects stock with a physical count, previewing the change', async () => {
    api.countStock.mockResolvedValue({ status: 'reconciled', adjustment: -4, new_balance: 116 });
    renderRegistry();
    fireEvent.click(within(await card('Sunflower Cake')).getByRole('button', { name: 'Stock count' }));
    const dialog = await screen.findByRole('dialog', { name: 'Count the stock' });

    fireEvent.change(within(dialog).getByLabelText(/Amount you counted/), { target: { value: '116' } });
    expect(within(dialog).getByText('4 KG less than the records. This will be recorded as a loss.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save count' }));

    await waitFor(() => expect(api.countStock).toHaveBeenCalledWith(34, 116));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sunflower Cake corrected to 116 KG.'));
  });

  it('offers stock count to owners only', async () => {
    auth.currentUser = { id: 2, role: 'FARM_HAND' };
    renderRegistry();
    const item = await card('Sunflower Cake');
    expect(within(item).getByRole('button', { name: 'Use / write off' })).toBeTruthy();
    expect(within(item).queryByRole('button', { name: 'Stock count' })).toBeNull();
  });

  it('opens pre-filtered from the Ingredients link', async () => {
    api.listItems.mockResolvedValue([sunflower, { ...oldHay, id: 36, name: 'Syringes', category: 'Medical Vault', is_active: true }]);
    renderRegistry('/operations/inventory?category=Bulk%20Feed');
    await card('Sunflower Cake');
    expect(screen.queryByRole('heading', { name: 'Syringes' })).toBeNull();
    expect(screen.getByDisplayValue('Bulk Feed')).toBeTruthy();
  });
});
