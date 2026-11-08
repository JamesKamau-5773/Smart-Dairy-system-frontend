import { feedCopy } from '../i18n/feed.en';

// Rules for an inventory item definition, shared by the register and edit
// forms so both reject the same impossible values the backend rejects.

// Inclusive limits from the backend (FEED_INVENTORY_API_CHANGES §3), keyed by form field.
export const NUTRIENT_LIMITS = Object.freeze({
  proteinGramsPerKg: { apiField: 'protein_grams_per_kg', max: 999.99 },
  energyMjPerKg: { apiField: 'energy_mj_per_kg', max: 30 },
  fiberGramsPerKg: { apiField: 'fiber_grams_per_kg', max: 999.99 },
});

const NUTRITION_AND_COST_FIELDS = ['proteinGramsPerKg', 'energyMjPerKg', 'fiberGramsPerKg', 'costPerKg'];

// The inventory category feed ingredients are kept under (see the item forms).
export const FEED_CATEGORY = 'Bulk Feed';

export const isFeedCategory = (category) => String(category ?? '').toLowerCase() === FEED_CATEGORY.toLowerCase();

const numberOrZero = (value) => Number(value ?? 0) || 0;

/** `{ field: message }` for an item form; empty when it can be saved. */
export function validateInventoryItem(form) {
  const errors = {};
  if (!String(form.name ?? '').trim()) errors.name = feedCopy.item.nameRequired;

  Object.entries(NUTRIENT_LIMITS).forEach(([field, { apiField, max }]) => {
    const raw = form[field];
    if (raw === '' || raw === null || raw === undefined) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > max) errors[field] = feedCopy.item.nutrientRange[apiField];
  });

  if (isFeedCategory(form.category) && NUTRITION_AND_COST_FIELDS.every((field) => numberOrZero(form[field]) === 0)) {
    errors.nutrition = feedCopy.item.feedNeedsValue;
  }
  return errors;
}

/** The backend's `data_warnings`, always as an array of `{ code, field, value, suggested_value, message }`. */
export function getDataWarnings(item) {
  const warnings = item?.data_warnings ?? item?.dataWarnings;
  return Array.isArray(warnings) ? warnings.filter((warning) => warning?.code) : [];
}

export const isArchived = (item) => item?.is_active === false;
