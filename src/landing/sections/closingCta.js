import { escapeHtml } from '../html.js';
import { linkButton } from '../parts/button.js';
import { photoBand } from '../parts/photoBand.js';

/**
 * "Put away the notebook" on the cows-feeding photo.
 * @param {{ copy: typeof import('../content.js').CLOSING_CTA, photo: import('../content.js').Photo }} props
 */
export const closingCta = ({ copy, photo }) => photoBand({
  photo,
  labelledBy: 'cta-title',
  scrim: 'medium',
  innerClass: 'flex flex-col items-center gap-9 py-24 text-center text-white md:py-[136px]',
  children: `
    <div class="max-w-[820px]">
      <h2 id="cta-title" class="m-0 text-[clamp(2.25rem,6.5vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">${escapeHtml(copy.title)}</h2>
      <p class="mx-auto mt-[18px] max-w-[620px] text-[clamp(1.0625rem,2vw,1.1875rem)] leading-relaxed text-mist-200">${escapeHtml(copy.intro)}</p>
    </div>
    <div class="flex flex-wrap justify-center gap-3">
      ${linkButton(copy.start, { size: 'xl' })}
      ${linkButton(copy.chat, { variant: 'outlineLight', size: 'xl' })}
    </div>`,
});
