import { describe, expect, it } from 'vitest';
import {
  formatCowIdentity,
  normalizeCowIdentity,
  resolveCowIdentityFromHerd,
} from '../cowIdentity';

describe('cowIdentity', () => {
  it('keeps the backend record ID separate from the farmer-facing identity', () => {
    expect(normalizeCowIdentity({ id: 46, tag_number: 'KE-0046', name: 'Malaika' })).toEqual({
      recordId: '46',
      earTag: 'KE-0046',
      name: 'Malaika',
    });
  });

  it('resolves a record containing only an internal ID against the herd', () => {
    expect(resolveCowIdentityFromHerd(
      { cow_id: 46 },
      [{ id: 46, tag_number: 'KE-0046', name: 'Malaika' }],
    )).toEqual({ recordId: '46', earTag: 'KE-0046', name: 'Malaika' });
  });

  it('formats name and ear tag without exposing the internal ID', () => {
    expect(formatCowIdentity({ id: 46, tag_number: 'KE-0046', name: 'Malaika' }))
      .toBe('Malaika · KE-0046');
  });

  it('uses a safe fallback when no farmer-facing identity is available', () => {
    expect(formatCowIdentity({ id: 46 })).toBe('Unknown cow');
  });
});