import { describe, expect, it } from 'vitest';
import { documentTitle } from '../documentTitle';

describe('documentTitle', () => {
  it('reads "<Page> · Maziwa Smart"', () => {
    expect(documentTitle('Ledger')).toBe('Ledger · Maziwa Smart');
  });

  it('is the product name alone without a page name', () => {
    expect(documentTitle('')).toBe('Maziwa Smart');
    expect(documentTitle(undefined)).toBe('Maziwa Smart');
    expect(documentTitle('Maziwa Smart')).toBe('Maziwa Smart');
  });
});
