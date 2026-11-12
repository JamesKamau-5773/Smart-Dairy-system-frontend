import { cx, escapeHtml, externalRel } from '../html.js';
import { icon } from '../icons.js';

/**
 * A footer contact tile: icon, label and value, the whole tile a link.
 * @param {{ label: string, value: string, href: string, icon: string, mono?: boolean }} contact
 */
export const contactCard = ({ label, value, href, icon: iconName, mono }) => `
        <a href="${escapeHtml(href)}"${externalRel(href)} class="flex items-center gap-3.5 rounded-card border border-white/15 bg-white/5 px-5 py-[18px] text-white hover:border-white/30 hover:text-white">
          <span class="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] bg-brand">${icon(iconName, 'size-5 text-white')}</span>
          <span class="flex min-w-0 flex-col gap-[3px]">
            <span class="text-xs font-bold uppercase tracking-[0.08em] text-glow">${escapeHtml(label)}</span>
            <span class="${cx('font-bold [overflow-wrap:anywhere]', mono ? 'font-mono text-[16px]' : 'text-[15px]')}">${escapeHtml(value)}</span>
          </span>
        </a>`;
