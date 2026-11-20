import { shellCopy } from '../i18n/shell';

/** The browser tab title: "<Page> · Maziwa Smart", or the product name alone when there is no page name. */
export function documentTitle(page) {
  const brand = shellCopy.brand.name;
  const name = typeof page === 'string' ? page.trim() : '';
  return name && name !== brand ? `${name} · ${brand}` : brand;
}
