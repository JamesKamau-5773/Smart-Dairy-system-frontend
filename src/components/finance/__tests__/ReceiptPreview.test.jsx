import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ReceiptPreview from '../ReceiptPreview';

afterEach(cleanup);

const receipt = {
  receipt_number: 'RCPT-2026-000014',
  status: 'ISSUED',
  amount: 5000,
  issued_at: '2026-10-22T17:58:00+03:00',
  transaction_date: '2026-10-22T17:58:00+03:00',
  tenant: { name: 'Kamau’s Farm Tenant' },
  farm: { name: 'Kamau’s Farm' },
  counterparty_name: 'Water Hotel',
  category: 'Milk Sale',
  payment_method: 'M-Pesa',
  payment_reference: '67ywtghi88w8778hsu8',
};

const open = (overrides = {}) => render(
  <ReceiptPreview isOpen receipt={{ ...receipt, ...overrides }} onClose={() => {}} onDownload={() => {}} onShare={() => {}} />
);

describe('ReceiptPreview', () => {
  it('shows the receipt as the backend sent it: number, amount, parties and details', () => {
    open();
    expect(screen.getByText('RCPT-2026-000014')).toBeTruthy();
    expect(screen.getByText('Kamau’s Farm Tenant')).toBeTruthy();
    expect(screen.getByText('Kamau’s Farm')).toBeTruthy();
    expect(screen.getByText('Water Hotel')).toBeTruthy();
    expect(screen.getByText('67ywtghi88w8778hsu8')).toBeTruthy();
    expect(screen.getByText('Issued').className).not.toContain('line-through');
  });

  it('marks a voided receipt in red and strikes through its amount', () => {
    open({ status: 'VOIDED' });
    expect(screen.getByText('Voided').className).toContain('text-danger');
    // The modal renders in a portal, outside the test's container.
    expect(document.body.querySelector('.line-through')).toBeTruthy();
  });

  it('says "Not recorded" for missing values, never a guess', () => {
    open({ counterparty_name: null, payment_method: null, payment_reference: null });
    expect(screen.getAllByText('Not recorded').length).toBe(3);
  });

  it('shows the farm name once when the account has the same name', () => {
    open({ tenant: { name: 'Silato Farm' }, farm: { name: 'Silato Farm' } });
    expect(screen.getAllByText('Silato Farm').length).toBe(1);
  });
});
