import { each, escapeHtml } from '../html.js';
import { contactCard } from '../parts/contactCard.js';
import { demoButton } from '../parts/demoButton.js';
import { logo } from '../parts/logo.js';

const LINK = 'inline-flex min-h-11 items-center py-1 text-mist-300 hover:text-white';

// A footer entry is a link ({ href }) or an action button ({ action }), such as the live demo.
const footerLink = (entry) => `
          <li>${entry.action
    ? demoButton(entry, { className: `${LINK} text-left font-semibold` })
    : `<a href="${escapeHtml(entry.href)}" class="${LINK}">${escapeHtml(entry.label)}</a>`}</li>`;

/**
 * Brand block, link columns, contact cards, wordmark and legal bar.
 * @param {{ name: string, year: number, footer: typeof import('../content.js').FOOTER }} props
 */
export const siteFooter = ({ name, year, footer }) => {
  const legal = footer.legal.filter((link) => link.href);
  return `
<footer class="scheme-dark border-t border-white/15 bg-navy-950 text-white">
  <div class="mx-auto max-w-[1200px] px-6 pb-7 pt-20">
    <div class="grid gap-12 md:grid-cols-4">
      <div class="min-w-0 md:col-span-2">
        ${logo(name, { className: 'flex items-center gap-3 text-[22px] font-extrabold tracking-[-0.02em] text-white' })}
        <p class="mt-4 max-w-[380px] text-[16px] leading-relaxed text-mist-400">${escapeHtml(footer.blurb)}</p>
        <ul class="mt-[22px] flex flex-wrap gap-2 text-[13px] font-bold text-mist-300">${each(footer.tags, (tag) => `
          <li class="rounded-full border border-white/20 px-3 py-[7px]">${escapeHtml(tag)}</li>`)}
        </ul>
      </div>${each(footer.columns, (column, index) => `
      <nav aria-labelledby="footer-col-${index}">
        <h2 id="footer-col-${index}" class="mb-2.5 text-xs font-bold uppercase tracking-[0.12em] text-glow">${escapeHtml(column.title)}</h2>
        <ul class="flex flex-col text-[15px] font-semibold">${each(column.links, footerLink)}
        </ul>
      </nav>`)}
    </div>
    <address class="mt-12 grid gap-4 not-italic [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">${each(footer.contacts, contactCard)}
    </address>
    <p aria-hidden="true" class="mt-14 overflow-hidden whitespace-nowrap text-[clamp(56px,13vw,190px)] font-extrabold leading-[0.9] tracking-[-0.05em] text-white/[0.06]">${escapeHtml(name)}</p>
    <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/15 pt-[22px] text-sm text-mist-400">
      <p>© ${year} ${escapeHtml(name)}. ${escapeHtml(footer.rights)}</p>${legal.length > 0 ? `
      <ul class="flex gap-6">${each(legal, (link) => `
        <li><a href="${escapeHtml(link.href)}" class="inline-flex min-h-11 items-center text-mist-400 hover:text-white">${escapeHtml(link.label)}</a></li>`)}
      </ul>` : ''}
    </div>
  </div>
</footer>`;
};
