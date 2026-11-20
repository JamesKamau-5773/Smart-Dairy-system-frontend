import { describe, expect, it } from 'vitest';
import { isNavItemActive, navItemHref } from '../navigation';

const inventory = { to: '/operations/inventory' };
const ingredients = { to: '/operations/inventory', query: { category: 'Bulk Feed' } };
const all = [inventory, ingredients];
const at = (pathname, search = '') => ({ pathname, search });

describe('sidebar active link', () => {
  it('lights only Ingredients on the feed-filtered view', () => {
    const here = at('/operations/inventory', '?category=Bulk+Feed');
    expect(isNavItemActive(ingredients, here, all)).toBe(true);
    expect(isNavItemActive(inventory, here, all)).toBe(false);
  });

  it('lights only Inventory on the unfiltered or differently filtered view', () => {
    for (const search of ['', '?category=Medical+Vault']) {
      expect(isNavItemActive(inventory, at('/operations/inventory', search), all)).toBe(true);
      expect(isNavItemActive(ingredients, at('/operations/inventory', search), all)).toBe(false);
    }
  });

  it('keeps exact and prefix matching for ordinary links', () => {
    expect(isNavItemActive({ to: '/feed-nutrition', exact: true }, at('/feed-nutrition/mix'))).toBe(false);
    expect(isNavItemActive({ to: '/feed-nutrition' }, at('/feed-nutrition/mix'))).toBe(true);
  });

  it('builds the link with its query', () => {
    expect(navItemHref(ingredients)).toBe('/operations/inventory?category=Bulk+Feed');
  });
});
