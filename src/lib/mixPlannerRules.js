import { feedCopy } from '../i18n/feed.en';

// What the mixing planner's buttons may do right now, and why not when they
// can't. Pure, so the page only renders the answer.

const { planner: copy } = feedCopy;

// Shares are percentages with two decimals; anything within this of 100 is 100.
export const SHARE_TOLERANCE = 0.01;

/** Sum of the ingredient shares, rounded to two decimals. */
export function getShareTotal(ingredients) {
  const total = (Array.isArray(ingredients) ? ingredients : [])
    .reduce((sum, ingredient) => sum + (Number(ingredient.percentage) || 0), 0);
  return Math.round(total * 100) / 100;
}

export const sharesAddUp = (total) => Math.abs(total - 100) <= SHARE_TOLERANCE;

const allowed = { disabled: false, reason: '' };
const blocked = (reason) => ({ disabled: true, reason });

/**
 * `{ check, adjust, save, batch }`, each `{ disabled, reason }`.
 * Shares that don't add up to 100% block saving and mixing instead of being
 * rescaled behind the farmer's back.
 */
export function getMixActionStates({ hasIngredients, hasSharedIngredients, hasLinkedIngredients, shareTotal, isBusy = false }) {
  const noItems = !hasIngredients ? blocked(copy.reasons.noIngredients) : null;
  const noShares = !hasSharedIngredients ? blocked(copy.reasons.noShares) : null;
  const notHundred = !sharesAddUp(shareTotal) ? blocked(copy.reasons.sharesNot100(shareTotal)) : null;
  const busy = isBusy ? blocked(copy.reasons.busy) : null;

  return {
    check: noItems ?? noShares ?? allowed,
    adjust: noItems ?? (!hasLinkedIngredients ? blocked(copy.reasons.notLinked) : allowed),
    save: noItems ?? noShares ?? notHundred ?? busy ?? allowed,
    batch: noItems ?? noShares ?? notHundred ?? busy ?? allowed,
  };
}
