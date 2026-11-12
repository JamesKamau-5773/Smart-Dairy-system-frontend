import { each, escapeHtml } from '../html.js';
import { icon } from '../icons.js';
import { sectionHeading } from '../parts/sectionHeading.js';

/** Frequently asked questions as native <details> accordions (#faq). */
export const faq = ({ title, items }) => `
<section id="faq" aria-labelledby="faq-title" class="bg-ground">
  <div class="mx-auto max-w-3xl px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'faq-title', title })}
    <div class="mt-10 space-y-4">${each(items, ({ q, a }) => `
      <details class="group rounded-[14px] border border-ink-200 bg-white">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-[14px] p-5 text-[17px] font-bold text-ink-900">${escapeHtml(q)}${icon('plus', 'size-5 text-ink-400 transition-transform group-open:rotate-45')}</summary>
        <p class="px-5 pb-5 text-[16px] leading-relaxed text-ink-700">${escapeHtml(a)}</p>
      </details>`)}
    </div>
  </div>
</section>`;
