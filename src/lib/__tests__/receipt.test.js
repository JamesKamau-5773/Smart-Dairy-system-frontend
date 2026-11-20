import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSharePdf, formatReceiptText, receiptFileName, shareReceipt } from '../receipt';

describe('receipt utilities', () => {
  it('formats a server-issued receipt without replacing its identifiers', () => {
    const receipt = {
      id: 9,
      receipt_number: 'RCPT-2026-000101',
      issued_at: '2026-08-28T10:00:00+00:00',
      amount: 1250.5,
      category: 'Milk Sale',
      counterparty_name: 'Kamau Farm',
      payment_reference: 'REF-123',
      description: 'Milk payment for August batch',
      payment_method: 'M-Pesa',
      tenant: { name: 'Jivu Farm' },
    };

    const text = formatReceiptText(receipt);
    expect(text).toContain('RCPT-2026-000101');
    expect(text).toContain('Payment reference: REF-123');
    expect(text).toContain('KES 1,250.50');
  });

  it('formats readable receipt text for sharing', () => {
    const receipt = {
      id: 'tx-202',
      receipt_number: 'RCPT-2026-000202',
      issued_at: '2026-08-30T10:00:00+00:00',
      amount: 500,
      category: 'Other Income',
      counterparty_name: 'County show',
      payment_method: 'Cash',
      payment_reference: 'CASH-30',
      description: 'Farm gate sale',
      tenant: { name: 'Jivu Farm' },
    };

    const text = formatReceiptText(receipt);
    expect(text).toContain('RCPT-2026-000202');
    expect(text).toContain('Jivu Farm');
    expect(text).toContain('County show');
    expect(text).toContain('KES 500.00');
  });
});

describe('sharing a receipt', () => {
  const receipt = { id: 9, receipt_number: 'RCPT-2026-000101', amount: 100, tenant: { name: 'Jivu Farm' } };
  const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubNavigator = (props) => vi.stubGlobal('navigator', { ...props });

  it('names the PDF after the receipt number the backend issued', () => {
    expect(receiptFileName(receipt)).toBe('RCPT-2026-000101.pdf');
    expect(receiptFileName({})).toBe('receipt.pdf');
  });

  it('shares the PDF itself where the device can share files', async () => {
    const share = vi.fn().mockResolvedValue();
    stubNavigator({ share, canShare: ({ files }) => files?.length === 1 });

    expect(canSharePdf()).toBe(true);
    await expect(shareReceipt(receipt, pdf)).resolves.toBe('file');
    const [{ files, title }] = share.mock.calls[0];
    expect(files[0].name).toBe('RCPT-2026-000101.pdf');
    expect(files[0].type).toBe('application/pdf');
    expect(title).toContain('RCPT-2026-000101');
  });

  it('shares the text where files cannot be shared, or there is no PDF', async () => {
    const share = vi.fn().mockResolvedValue();
    stubNavigator({ share, canShare: () => false });

    expect(canSharePdf()).toBe(false);
    await expect(shareReceipt(receipt, pdf)).resolves.toBe('text');
    expect(share.mock.calls[0][0].text).toContain('RCPT-2026-000101');
    expect(share.mock.calls[0][0].files).toBeUndefined();
  });

  it('copies the text where the device cannot share', async () => {
    const writeText = vi.fn().mockResolvedValue();
    stubNavigator({ clipboard: { writeText } });

    await expect(shareReceipt(receipt, null)).resolves.toBe('copied');
    expect(writeText.mock.calls[0][0]).toContain('KES 100.00');
  });

  it('says nothing was shared when the device can neither share nor copy', async () => {
    stubNavigator({});
    await expect(shareReceipt(receipt, pdf)).resolves.toBe('none');
  });

  it('passes the share sheet being closed back to the caller', async () => {
    const closed = Object.assign(new Error('closed'), { name: 'AbortError' });
    stubNavigator({ share: vi.fn().mockRejectedValue(closed), canShare: () => true });
    await expect(shareReceipt(receipt, pdf)).rejects.toBe(closed);
  });
});
