import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CowPhoto from '../CowPhoto';
import { DATA_SAVER_STALE_TIME_MS, NORMAL_STALE_TIME_MS, isDataSaverEnabled, setDataSaverEnabled } from '../../../lib/dataSaver';
import { QueryProvider, queryClient } from '../../../providers/QueryProvider';

void React;

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: null }) }));

const setPhoneSaveData = (value) => {
  Object.defineProperty(window.navigator, 'connection', { configurable: true, value: value === undefined ? undefined : { saveData: value } });
};

describe('data saver setting', () => {
  beforeEach(() => {
    localStorage.clear();
    setPhoneSaveData(undefined);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    setPhoneSaveData(undefined);
  });

  it('follows the phone’s own data saver until the farmer chooses', () => {
    expect(isDataSaverEnabled()).toBe(false);
    setPhoneSaveData(true);
    expect(isDataSaverEnabled()).toBe(true);
    setDataSaverEnabled(false);
    expect(isDataSaverEnabled()).toBe(false);
  });

  it('holds back cow photos until tapped while on, and shows them while off', () => {
    setDataSaverEnabled(true);
    render(<CowPhoto src="/uploads/neema.jpg" alt="Neema" size={64} fallback="NE" />);
    expect(screen.queryByAltText('Neema')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /show photo/i }));
    expect(screen.getByAltText('Neema').getAttribute('loading')).toBe('lazy');

    cleanup();
    act(() => setDataSaverEnabled(false));
    render(<CowPhoto src="/uploads/neema.jpg" alt="Neema" size={64} fallback="NE" />);
    expect(screen.getByAltText('Neema')).toBeTruthy();
  });

  it('shows the fallback when the cow has no photo', () => {
    render(<CowPhoto src={null} alt="Neema" size={64} fallback="NE" />);
    expect(screen.getByText('NE')).toBeTruthy();
  });
});

describe('data saver and background refreshing', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('keeps data fresh for 30 minutes instead of 5 while on', () => {
    render(<QueryProvider><p>app</p></QueryProvider>);
    act(() => setDataSaverEnabled(true));
    expect(queryClient.getDefaultOptions().queries.staleTime).toBe(DATA_SAVER_STALE_TIME_MS);
    act(() => setDataSaverEnabled(false));
    expect(queryClient.getDefaultOptions().queries.staleTime).toBe(NORMAL_STALE_TIME_MS);
    expect(queryClient.getDefaultOptions().mutations.networkMode).toBe('always');
  });
});
