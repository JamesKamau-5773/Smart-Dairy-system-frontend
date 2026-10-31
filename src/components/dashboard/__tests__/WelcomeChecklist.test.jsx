import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeChecklist from '../WelcomeChecklist';
import MilestoneBanner from '../MilestoneBanner';

void React;
afterEach(cleanup);

const api = vi.hoisted(() => ({ listHerd: vi.fn(), listCustomers: vi.fn() }));

vi.mock('../../../lib/backendApi', () => ({
  herdApi: { list: api.listHerd },
  financeApi: { listCustomers: api.listCustomers },
}));

const STORAGE_KEY = 'maziwa_welcome:tenant_1:farm_1';

const renderWithProviders = (ui) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);

const renderChecklist = ({ milkRecords = [] } = {}) => renderWithProviders(
  <WelcomeChecklist tenantId="tenant_1" farmId="farm_1" milkRecords={milkRecords} milkLoaded />,
);

describe('WelcomeChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
    api.listHerd.mockReset().mockResolvedValue([]);
    api.listCustomers.mockReset().mockResolvedValue([]);
  });

  it('guides a brand-new farm through three steps, starting with a cow', async () => {
    renderChecklist();

    expect(await screen.findByRole('heading', { name: 'Get your farm set up' })).toBeTruthy();
    expect(screen.getByText(/0 of 3 done/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Add your first cow/ }).getAttribute('href')).toBe('/operations/herd');
    expect(screen.getByRole('link', { name: /Record a milking/ }).getAttribute('href')).toBe('/operations/yield');
    expect(screen.getByRole('link', { name: /Add a buyer/ }).getAttribute('href')).toBe('/finance/buyers');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('active');
  });

  it('ticks off finished steps and shows progress', async () => {
    api.listHerd.mockResolvedValue([{ id: 1 }]);
    renderChecklist();

    expect(await screen.findByText(/1 of 3 done/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Add your first cow/ })).toBeNull();
    expect(screen.getByText('Add your first cow')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('33');
  });

  it('celebrates when a farm that was working through the list finishes it', async () => {
    localStorage.setItem(STORAGE_KEY, 'active');
    api.listHerd.mockResolvedValue([{ id: 1 }]);
    api.listCustomers.mockResolvedValue([{ id: 7 }]);
    renderChecklist({ milkRecords: [{ amount: 12 }] });

    expect(await screen.findByText('Hongera! Your farm is set up.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByText('Hongera! Your farm is set up.')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('done');
  });

  it('never shows to a farm that was already set up', async () => {
    api.listHerd.mockResolvedValue([{ id: 1 }]);
    api.listCustomers.mockResolvedValue([{ id: 7 }]);
    const { container } = renderChecklist({ milkRecords: [{ amount: 12 }] });

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe('done'));
    expect(container.textContent).toBe('');
  });

  it('can be hidden for good, and then stops fetching', async () => {
    renderChecklist();
    fireEvent.click(await screen.findByRole('button', { name: 'Hide the setup checklist' }));

    expect(screen.queryByRole('heading', { name: 'Get your farm set up' })).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dismissed');

    cleanup();
    api.listHerd.mockClear();
    renderChecklist();
    expect(api.listHerd).not.toHaveBeenCalled();
  });
});

describe('MilestoneBanner', () => {
  const MILESTONE_KEY = 'maziwa_milestone:tenant_1:farm_1';
  const renderBanner = (litres) => renderWithProviders(
    <MilestoneBanner tenantId="tenant_1" farmId="farm_1" milkRecords={[{ amount: litres }]} milkLoaded />,
  );

  beforeEach(() => localStorage.clear());

  it('does not congratulate an existing farm for old records', async () => {
    const { container } = renderBanner(3113.6);
    await waitFor(() => expect(localStorage.getItem(MILESTONE_KEY)).toBe('1000'));
    expect(container.textContent).toBe('');
  });

  it('congratulates once when a new milestone is crossed', () => {
    localStorage.setItem(MILESTONE_KEY, '0');
    renderBanner(105);

    expect(screen.getByText(/litres recorded!/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss milestone' }));

    expect(screen.queryByText(/litres recorded!/)).toBeNull();
    expect(localStorage.getItem(MILESTONE_KEY)).toBe('100');
  });
});
