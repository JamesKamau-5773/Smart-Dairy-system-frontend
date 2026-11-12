import { each, escapeHtml } from '../html.js';
import { icon } from '../icons.js';
import { buttonClass, linkButton } from '../parts/button.js';
import { demoButton } from '../parts/demoButton.js';
import { photoBand } from '../parts/photoBand.js';

/**
 * Full-bleed calf photo with the headline in the lower left.
 * @param {{ copy: object, photo: import('../content.js').Photo, demo: import('../content.js').ActionButton }} props
 */
export const hero = ({ copy, photo, demo }) => photoBand({
  photo,
  id: 'top',
  scrim: 'fade',
  eager: true,
  imageClass: 'landing-zoom',
  innerClass: 'flex min-h-[600px] items-end pb-20 pt-24 md:min-h-[820px] md:pb-[104px] md:pt-40',
  children: `
    <div class="landing-rise flex min-w-0 max-w-[660px] flex-col gap-6">
      <p class="text-[13px] font-bold uppercase tracking-[0.1em] text-glow">${escapeHtml(copy.eyebrow)}</p>
      <h1 class="m-0 text-[clamp(2.5rem,7.5vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white">${escapeHtml(copy.title)} <span class="text-glow-strong">${escapeHtml(copy.titleHighlight)}</span></h1>
      <p class="max-w-[560px] text-[clamp(1.0625rem,2vw,1.1875rem)] leading-relaxed text-mist-200">${escapeHtml(copy.intro)}</p>
      <div class="mt-1 flex flex-wrap gap-3">
        ${linkButton(copy.start)}
        ${demoButton(demo, { className: buttonClass({ variant: 'light' }), withIcon: true })}
      </div>
      <ul class="mt-2 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/30 pt-5 text-[15px] font-semibold text-mist-100">${each(copy.highlights, (item) => `
        <li class="flex items-center gap-2">${icon(item.icon, 'size-[18px] text-glow')}${escapeHtml(item.text)}</li>`)}
      </ul>
    </div>`,
});
