import { each } from '../html.js';
import { featureCard } from '../parts/featureCard.js';
import { sectionHeading } from '../parts/sectionHeading.js';

/** "Sound familiar?": the three problems the app solves. */
export const problems = ({ title, items }) => `
<section aria-labelledby="problems-title" class="border-b border-ink-200 bg-ground">
  <div class="mx-auto max-w-[1200px] px-6 py-[72px] md:py-24">
    ${sectionHeading({ id: 'problems-title', title })}
    <ul class="mt-10 grid gap-6 md:grid-cols-3">${each(items, (item) => featureCard(item))}
    </ul>
  </div>
</section>`;
