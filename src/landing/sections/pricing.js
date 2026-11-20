import { each } from '../html.js';
import { linkButton } from '../parts/button.js';
import { planCard } from '../parts/planCard.js';
import { sectionHeading } from '../parts/sectionHeading.js';

/**
 * Plans and the two calls to action under them (#pricing).
 * @param {{ copy: typeof import('../content.js').PRICING, plans: import('../content.js').Plan[] }} props
 */
export const pricing = ({ copy, plans }) => `
<section id="pricing" aria-labelledby="pricing-title" class="border-b border-ink-200 bg-ground">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'pricing-title', eyebrow: copy.eyebrow, title: copy.title, intro: copy.intro, className: 'mb-10' })}
    <div class="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">${each(plans, (plan) => planCard(plan, copy))}
    </div>
    <div class="mt-9 flex flex-wrap gap-3">
      ${linkButton(copy.start)}
      ${linkButton(copy.ask, { variant: 'light' })}
    </div>
  </div>
</section>`;
