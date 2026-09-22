import { describe, expect, it } from 'vitest';
import { toApiBaseUrl } from './apiBaseUrl';

describe('toApiBaseUrl', () => {
  it('appends /api when configured with a backend origin', () => {
    expect(toApiBaseUrl('https://smart-farm-erp-backend.onrender.com'))
      .toBe('https://smart-farm-erp-backend.onrender.com/api');
  });

  it('does not duplicate /api when it is already configured', () => {
    expect(toApiBaseUrl('https://smart-farm-erp-backend.onrender.com/api/'))
      .toBe('https://smart-farm-erp-backend.onrender.com/api');
  });
});
