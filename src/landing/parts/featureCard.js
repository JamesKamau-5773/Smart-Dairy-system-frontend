import { cx, escapeHtml } from '../html.js';
import { icon } from '../icons.js';

/**
 * A card with an icon, a title and a sentence. Used by "Sound familiar?",
 * "Built for the real work of a farm" and the numbered "Start in three steps".
 * @param {import('../content.js').FeatureCard} card
 * @param {{ step?: number }} [options]  `step` adds a 01/02/03 label.
 */
export const featureCard = ({ icon: iconName, title, text, tone }, { step } = {}) => {
  const danger = tone === 'danger';
  return `
        <li class="${cx('rounded-[14px] border p-7', danger ? 'border-danger/25 bg-danger-surface' : 'border-ink-200 bg-white')}">
          ${step ? `<span class="font-mono text-sm font-semibold text-brand">${String(step).padStart(2, '0')}</span>` : ''}
          <span class="${cx('flex size-10 items-center justify-center rounded-button', step && 'mt-3', danger ? 'bg-danger/10 text-danger' : 'bg-brand-tint text-brand')}">${icon(iconName)}</span>
          <h3 class="mt-4 text-[19px] font-extrabold tracking-[-0.01em] text-ink-900">${escapeHtml(title)}</h3>
          <p class="mt-2 text-[16px] leading-relaxed text-ink-600">${escapeHtml(text)}</p>
        </li>`;
};
