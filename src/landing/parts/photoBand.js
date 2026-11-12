import { cx } from '../html.js';
import { picture } from './picture.js';

// Scrims keep text on the photos at 4.5:1 or better. The hero fades left to right
// on wide screens and is flat on phones, where the text spans the whole photo.
const SCRIMS = {
  fade: 'bg-[rgba(7,20,31,0.80)] md:bg-transparent md:bg-[linear-gradient(90deg,rgba(7,20,31,0.92)_0%,rgba(7,20,31,0.80)_38%,rgba(7,20,31,0.40)_70%,rgba(7,20,31,0.15)_100%)]',
  strong: 'bg-[rgba(7,20,31,0.76)]',
  medium: 'bg-[rgba(7,20,31,0.72)]',
};

/**
 * A full-bleed photo section: photo, dark scrim, then the children on top.
 * Shared by the hero, the farmer stories and the closing call to action.
 * @param {{
 *   photo: import('../content.js').Photo,
 *   scrim: keyof typeof SCRIMS,
 *   children: string,
 *   id?: string,
 *   labelledBy?: string,
 *   eager?: boolean,
 *   imageClass?: string,
 *   innerClass?: string,
 * }} props
 */
export const photoBand = ({ photo, scrim, children, id, labelledBy, eager = false, imageClass, innerClass }) => `
<section${id ? ` id="${id}"` : ''}${labelledBy ? ` aria-labelledby="${labelledBy}"` : ''} class="scheme-dark relative overflow-hidden bg-navy-900">
  ${picture(photo, { eager, className: cx('absolute inset-0 size-full object-cover', imageClass) })}
  <div aria-hidden="true" class="absolute inset-0 ${SCRIMS[scrim]}"></div>
  <div class="${cx('relative mx-auto max-w-[1200px] px-6', innerClass)}">${children}
  </div>
</section>`;
