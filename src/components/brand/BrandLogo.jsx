import { cn } from '../../lib/utils';
import { shellCopy } from '../../i18n/shell';
import { brandLogoImage } from './brandLogo';

const { brand: copy } = shellCopy;

/**
 * The Maziwa Smart logo, the one way the app shows it. Screens choose the variant, size and tone;
 * the artwork itself is the supplied file, never redrawn, recoloured, cropped or animated.
 *
 * To link it home, wrap it in a link labelled `shellCopy.brand.home` and pass `decorative`.
 *
 * @param {object} props
 * @param {'horizontal'|'stacked'|'stacked-endorsed'|'wordmark'|'mascot'} [props.variant]
 * @param {'light'|'dark'|'ink'} [props.tone] `dark` on brand-blue or dark backgrounds.
 * @param {number} [props.size] px: the height for horizontal and mascot, the width for the rest.
 *   Raised to the variant's minimum (brandLogo.MIN_SIZE).
 * @param {boolean} [props.decorative] Empty alt, for a logo whose meaning is already given nearby.
 * @param {string} [props.className] Placement only (margins, responsive width or height).
 */
export default function BrandLogo({ variant = 'horizontal', tone = 'light', size, decorative = false, className }) {
  const { src, srcSet, width, height } = brandLogoImage({ variant, tone, size });
  const alt = variant === 'stacked-endorsed' ? copy.endorsed : copy.name;
  return (
    <img
      src={src}
      srcSet={srcSet}
      width={width}
      height={height}
      alt={decorative ? '' : alt}
      draggable={false}
      decoding="async"
      className={cn('shrink-0 select-none object-contain', className)}
    />
  );
}
