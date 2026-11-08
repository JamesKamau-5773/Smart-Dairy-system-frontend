import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import FastMilkLog from '../FastMilkLog';
import { productionApi } from '../../../lib/backendApi';
import offlineQueue from '../../../lib/offlineQueue';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../hooks/useTenant', () => ({
  useTenant: () => ({ tenantId: 'tenant_1', farmId: 'farm_1' }),
}));

vi.mock('../../../lib/offlineQueue', () => ({
  default: { enqueue: vi.fn().mockResolvedValue('queued-1') },
}));

vi.mock('../../../lib/backendApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    herdApi: { list: vi.fn().mockResolvedValue([{ id: 57, tag_number: 'KE-012', name: 'Neema', status: 'Milking' }]) },
    safetyApi: { activeHardlocks: vi.fn().mockResolvedValue([]) },
    productionApi: {
      ...actual.productionApi,
      createYield: vi.fn(),
      updateYield: vi.fn(),
      deleteYield: vi.fn(),
    },
  };
});

// The shape productionLog passes: `cowId` is the cow's tag.
const EXISTING_RECORD = {
  id: 'milk-1', cowId: 'KE-012', cowName: 'Neema', amount: '14.5', session: 'morning', date: '2026-11-01',
};

const serverError = (status, code) => Object.assign(new Error(`HTTP ${status}`), {
  isAxiosError: true,
  response: { status, data: code ? { code } : {} },
});

const keyOf = (mockFn, call) => mockFn.mock.calls[call].at(-1).headers['Idempotency-Key'];

function renderLog(props = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { networkMode: 'always' } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><FastMilkLog {...props} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillNewEntry(litres = '12.5') {
  const cowSelect = await screen.findByRole('combobox');
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(cowSelect, { target: { value: '57' } });
  fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: litres } });
}

const saveButton = () => screen.getByRole('button', { name: /Save Record|Saving/i });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('FastMilkLog saving a new record', () => {
  it('saves once when Save is triggered twice in the same tick (double tap / Enter + tap)', async () => {
    let resolveSave;
    productionApi.createYield.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderLog();
    await fillNewEntry();

    const form = saveButton().closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);

    // React Query runs mutationFn a microtask after mutate().
    await waitFor(() => expect(productionApi.createYield).toHaveBeenCalled());
    expect(productionApi.createYield).toHaveBeenCalledTimes(1);
    resolveSave({ id: 1 });
    expect(await screen.findByText('Saved!')).toBeTruthy();
    expect(productionApi.createYield).toHaveBeenCalledTimes(1);
  });

  it('disables Save and shows "Saving..." while the save is in flight', async () => {
    productionApi.createYield.mockImplementation(() => new Promise(() => {}));
    renderLog();
    await fillNewEntry();

    fireEvent.click(saveButton());

    await waitFor(() => expect(saveButton().disabled).toBe(true));
    expect(saveButton().textContent).toMatch(/Saving/);
  });

  it('retries a failed save with the same Idempotency-Key, so the backend saves it once', async () => {
    productionApi.createYield
      .mockRejectedValueOnce(serverError(503))
      .mockResolvedValueOnce({ id: 1 });
    renderLog();
    await fillNewEntry();

    fireEvent.click(saveButton());
    expect(await screen.findByText('Couldn’t save. Your entry is still here. Try again.')).toBeTruthy();
    expect(screen.getByPlaceholderText('0.0').value).toBe('12.5');

    fireEvent.click(saveButton());
    expect(await screen.findByText('Saved!')).toBeTruthy();
    expect(productionApi.createYield).toHaveBeenCalledTimes(2);
    expect(keyOf(productionApi.createYield, 1)).toBe(keyOf(productionApi.createYield, 0));
  });

  it('uses a new key when the farmer changes the entry before trying again', async () => {
    productionApi.createYield
      .mockRejectedValueOnce(serverError(503))
      .mockResolvedValueOnce({ id: 1 });
    renderLog();
    await fillNewEntry('12.5');

    fireEvent.click(saveButton());
    await screen.findByText('Couldn’t save. Your entry is still here. Try again.');
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '13' } });
    fireEvent.click(saveButton());

    await screen.findByText('Saved!');
    expect(keyOf(productionApi.createYield, 1)).not.toBe(keyOf(productionApi.createYield, 0));
  });

  it('gives the next entry a new key after a confirmed save', async () => {
    productionApi.createYield.mockResolvedValue({ id: 1 });
    renderLog();
    await fillNewEntry('12.5');
    fireEvent.click(saveButton());
    await screen.findByText('Saved!');

    // Same cow and amount again: a separate entry, so it must not reuse the first key.
    await screen.findByRole('button', { name: /Save Record/i }, { timeout: 3000 });
    await fillNewEntry('12.5');
    fireEvent.click(saveButton());

    await waitFor(() => expect(productionApi.createYield).toHaveBeenCalledTimes(2));
    expect(keyOf(productionApi.createYield, 1)).not.toBe(keyOf(productionApi.createYield, 0));
  });

  it('queues an unanswered save on this phone under the key that was already sent', async () => {
    productionApi.createYield.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    renderLog();
    await fillNewEntry('12.5');

    fireEvent.click(saveButton());

    expect(await screen.findByText('Saved on this phone')).toBeTruthy();
    const sentKey = keyOf(productionApi.createYield, 0);
    expect(offlineQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ cow_id: '57', amount: 12.5, session: 'morning' }),
      { idempotencyKey: sentKey },
    );
  });
});

describe('FastMilkLog editing a record', () => {
  it('updates the record in place (PATCH) and never deletes it', async () => {
    productionApi.updateYield.mockResolvedValue({ id: 'milk-1', amount: 15, session: 'morning' });
    const onSaveSuccess = vi.fn();
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onSaveSuccess, onClose: vi.fn() });

    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Record/i }));

    expect(await screen.findByText('Saved!')).toBeTruthy();
    expect(productionApi.updateYield).toHaveBeenCalledWith(
      'milk-1',
      expect.objectContaining({ amount: 15, session: 'morning', milking_date: '2026-11-01' }),
      { headers: { 'Idempotency-Key': expect.any(String) } },
    );
    expect(productionApi.deleteYield).not.toHaveBeenCalled();
    expect(productionApi.createYield).not.toHaveBeenCalled();
    expect(onSaveSuccess).toHaveBeenCalled();
  });

  it('shows the cow read-only, because an edit cannot move milk to another cow', () => {
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onClose: vi.fn() });

    const cow = screen.getByLabelText('Cow');
    expect(cow.readOnly).toBe(true);
    expect(cow.value).toBe('Neema · KE-012');
    expect(screen.getByText(/delete this record and record it again for the right cow/i)).toBeTruthy();
  });
});

describe('FastMilkLog deleting a record', () => {
  it('asks in an in-app dialog (not the browser confirm) and does nothing on Keep', async () => {
    const browserConfirm = vi.spyOn(window, 'confirm');
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onClose: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: /Delete Record/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete this milk record?' });
    expect(within(dialog).getByText('Neema · KE-012 · morning · 2026-11-01 · 14.5 L. You can’t undo this.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete this milk record?' })).toBeNull());
    expect(productionApi.deleteYield).not.toHaveBeenCalled();
    expect(browserConfirm).not.toHaveBeenCalled();
    browserConfirm.mockRestore();
  });

  it('deletes after confirming, then tells the farmer and closes', async () => {
    productionApi.deleteYield.mockResolvedValue({ data: { id: 'milk-1', already_deleted: false } });
    const onDeleteSuccess = vi.fn();
    const onClose = vi.fn();
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onDeleteSuccess, onClose });

    fireEvent.click(screen.getByRole('button', { name: /Delete Record/i }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(productionApi.deleteYield).toHaveBeenCalledWith('milk-1');
    expect(toast.success).toHaveBeenCalledWith('Milk record deleted.');
    expect(onDeleteSuccess).toHaveBeenCalledWith(EXISTING_RECORD);
  });

  it('says the delete will happen when back online when it was queued, not that it is done', async () => {
    productionApi.deleteYield.mockResolvedValue({ data: { queued: true, offline: true, queue_id: 'q9' } });
    const onClose = vi.fn();
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onClose });

    fireEvent.click(screen.getByRole('button', { name: /Delete Record/i }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Will be deleted when you’re back online.');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the form open with a clear message when the delete fails', async () => {
    productionApi.deleteYield.mockRejectedValue(serverError(503));
    const onClose = vi.fn();
    renderLog({ mode: 'edit', record: EXISTING_RECORD, onClose });

    fireEvent.click(screen.getByRole('button', { name: /Delete Record/i }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Couldn’t delete this record. Try again.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
