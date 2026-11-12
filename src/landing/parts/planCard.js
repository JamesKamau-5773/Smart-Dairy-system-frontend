import { cx, each, escapeHtml } from '../html.js';

const formatKes = (price) => `KSh ${price.toLocaleString('en-KE')}`;

/**
 * One pricing plan. Without a price it shows the "coming soon" tag.
 * @param {import('../content.js').Plan} plan
 * @param {{ comingSoon: string }} labels
 */
export const planCard = (plan, { comingSoon }) => `
        <article class="${cx('flex flex-col gap-4 rounded-[14px] bg-white', plan.highlighted ? 'border-2 border-brand p-[27px]' : 'border border-ink-200 p-7')}">
          <div>
            <h3 class="text-[19px] font-extrabold text-ink-900">${escapeHtml(plan.name)}</h3>
            <p class="mt-1 text-sm text-ink-600">${escapeHtml(plan.audience)}</p>
          </div>
          ${plan.price == null
    ? `<p class="self-start rounded-[6px] bg-brand-tint px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand">${escapeHtml(comingSoon)}</p>`
    : `<p class="font-mono text-3xl font-bold text-ink-900">${formatKes(plan.price)}<span class="font-sans text-[15px] font-medium text-ink-600"> / ${escapeHtml(plan.period)}</span></p>`}
          <ul class="flex flex-col gap-2.5 text-[15px] leading-[1.45] text-ink-700">${each(plan.features, (feature) => `
            <li>${escapeHtml(feature)}</li>`)}
          </ul>
        </article>`;
