import { each } from '../html.js';
import { photoBand } from '../parts/photoBand.js';
import { sectionHeading } from '../parts/sectionHeading.js';
import { testimonialCard } from '../parts/testimonialCard.js';

/**
 * Farmer stories on the cows photo (#stories). One card per entry in content.js.
 * @param {{ copy: typeof import('../content.js').TESTIMONIALS, photo: import('../content.js').Photo }} props
 */
export const testimonials = ({ copy, photo }) => photoBand({
  photo,
  id: 'stories',
  labelledBy: 'stories-title',
  scrim: 'strong',
  innerClass: 'py-20 md:py-[120px]',
  children: `
    ${sectionHeading({ id: 'stories-title', eyebrow: copy.eyebrow, title: copy.title, intro: copy.intro, tone: 'light', size: 'lg' })}
    <ul class="mt-12 flex flex-wrap gap-8 md:gap-12">${each(copy.items, testimonialCard)}
    </ul>`,
});
