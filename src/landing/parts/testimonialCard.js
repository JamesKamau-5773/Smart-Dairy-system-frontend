import { escapeHtml } from '../html.js';
import { icon } from '../icons.js';

/** One farmer story. @param {import('../content.js').Testimonial} testimonial */
export const testimonialCard = ({ quote, name, location, herd }) => `
      <li class="flex min-w-0 flex-[1_1_420px]">
        <figure class="m-0 flex w-full flex-col gap-7 rounded-2xl bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-10">
          ${icon('quote-mark', 'h-7 w-9 text-brand')}
          <blockquote class="m-0 flex-1 text-[clamp(1.125rem,2.2vw,1.3125rem)] font-semibold leading-normal tracking-[-0.01em] text-ink-900">${escapeHtml(quote)}</blockquote>
          <figcaption class="flex items-center gap-3.5 border-t border-ink-200 pt-6">
            <span aria-hidden="true" class="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-[18px] font-extrabold text-white">${escapeHtml(name.charAt(0))}</span>
            <span class="flex flex-col gap-0.5">
              <span class="text-[16px] font-extrabold text-ink-900">${escapeHtml(name)}</span>
              <span class="text-sm text-ink-600">${escapeHtml(location)} · ${escapeHtml(herd)}</span>
            </span>
          </figcaption>
        </figure>
      </li>`;
