import { escapeHtml, externalRel } from '../html.js';

const LINK = 'inline-flex min-h-11 items-center text-white hover:text-mist-300';

/**
 * Navy strip above the header: tagline, location, phone and WhatsApp.
 * @param {{ tagline: string, location: string, phone: { value: string, href: string }, whatsapp: { label: string, href: string } }} props
 */
export const topBar = ({ tagline, location, phone, whatsapp }) => `
<div class="scheme-dark bg-navy text-sm font-semibold text-mist-300">
  <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-0 px-6">
    <p class="py-[11px]">${escapeHtml(tagline)}</p>
    <p class="flex flex-wrap items-center gap-x-6">
      <span class="py-[11px]">${escapeHtml(location)}</span>
      <a href="${escapeHtml(phone.href)}" class="${LINK} font-mono">${escapeHtml(phone.value)}</a>
      <a href="${escapeHtml(whatsapp.href)}"${externalRel(whatsapp.href)} class="${LINK}">${escapeHtml(whatsapp.label)}</a>
    </p>
  </div>
</div>`;
