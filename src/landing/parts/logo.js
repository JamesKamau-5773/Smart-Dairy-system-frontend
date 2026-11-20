import { cx, escapeHtml } from '../html.js';
import { brandLogoImage } from '../../components/brand/brandLogo.js';

/**
 * The brand logo for the static landing page: the same files, minimum sizes and box as the app's
 * BrandLogo component (components/brand/brandLogo.js), as an HTML string. The artwork is used
 * exactly as supplied, never redrawn.
 *
 * @param {object} options
 * @param {'horizontal'|'stacked'|'stacked-endorsed'|'wordmark'|'mascot'} options.variant
 * @param {'light'|'dark'} [options.tone] `dark` on navy or brand-blue backgrounds.
 * @param {number} options.size px: the height for horizontal and mascot, the width for the rest.
 * @param {string} [options.alt] Empty for a logo inside a labelled link.
 * @param {'eager'|'lazy'} [options.loading]
 * @param {string} [options.className] Placement only.
 */
export const brandLogo = ({ variant, tone = 'light', size, alt = '', loading = 'lazy', className }) => {
  const { src, srcSet, width, height } = brandLogoImage({ variant, tone, size });
  return `<img src="${src}"${srcSet ? ` srcset="${srcSet}"` : ''} width="${width}" height="${height}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" draggable="false" class="${cx('shrink-0 select-none object-contain', className)}">`;
};
