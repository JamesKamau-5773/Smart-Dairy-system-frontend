import { describe, expect, it } from 'vitest';
import { cn } from '../utils';
import { TYPE_ROLES } from '../../styles/typeRoles';

describe('cn with the type roles', () => {
  it('keeps a role next to a text colour', () => {
    for (const role of TYPE_ROLES) {
      expect(cn(`text-${role}`, 'text-ink-muted')).toBe(`text-${role} text-ink-muted`);
      expect(cn('text-brand', `text-${role}`)).toBe(`text-brand text-${role}`);
    }
  });

  it('lets a later role replace an earlier size', () => {
    expect(cn('text-sm', 'text-meta')).toBe('text-meta');
    expect(cn('text-body', 'text-label')).toBe('text-label');
    expect(cn('text-label', 'sm:text-body')).toBe('text-label sm:text-body');
  });
});
