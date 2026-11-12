import { each, escapeHtml } from '../html.js';
import { buttonClass } from '../parts/button.js';
import { logo } from '../parts/logo.js';

/**
 * Logo (links home) on the left, section links in the middle, log in and the
 * primary action on the right. On phones the links drop to a second row.
 * @param {{ name: string, links: import('../content.js').Link[], login: import('../content.js').Link, start: import('../content.js').Link }} props
 */
export const siteHeader = ({ name, links, login, start }) => `
<header class="border-b border-ink-200 bg-white">
  <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3.5">
    <a href="/" aria-label="${escapeHtml(name)} home" class="flex min-h-11 items-center">
      ${logo(name, { className: 'flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.02em] text-brand' })}
    </a>
    <nav aria-label="Main" class="order-last w-full md:order-none md:w-auto">
      <ul class="flex flex-wrap gap-x-7 text-[15px] font-semibold">${each(links, (link) => `
        <li><a href="${escapeHtml(link.href)}" class="inline-flex min-h-11 items-center text-ink-700 hover:text-brand">${escapeHtml(link.label)}</a></li>`)}
      </ul>
    </nav>
    <div class="flex items-center gap-5">
      <a href="${escapeHtml(login.href)}" class="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink-700 hover:text-brand">${escapeHtml(login.label)}</a>
      <a href="${escapeHtml(start.href)}" class="${buttonClass({ size: 'md' })}">${escapeHtml(start.label)}</a>
    </div>
  </div>
</header>`;
