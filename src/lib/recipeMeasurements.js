import { feedCopy } from '../i18n/feed.en';

// How a saved mix is measured out at feeding time (optional auto-save fields,
// FEED_INVENTORY_API_CHANGES §2). Kept apart from the shares so the formulation
// logic doesn't need to know about buckets and scoops.

const { mix: copy } = feedCopy;

export const QUANTITY_BASES = Object.freeze(['concentrate', 'total_ration']);

const NUMERIC_FIELDS = ['concentrate_kg_per_head_day', 'bulk_density_kg_per_litre', 'bucket_volume_litres', 'scoop_weight_kg'];

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

/** Dairy meal is fed as a concentrate on top of forage; the main meal is the whole ration. */
export function defaultMeasurements(recipeType) {
  return {
    quantity_basis: recipeType === 'dairy_meal' ? 'concentrate' : 'total_ration',
    concentrate_kg_per_head_day: '',
    bulk_density_kg_per_litre: '',
    bucket_volume_litres: '',
    scoop_weight_kg: '',
  };
}

/** `{ field: message }`; empty when the measurements can be saved. */
export function validateMeasurements(measures) {
  const errors = {};
  NUMERIC_FIELDS.forEach((field) => {
    if (hasValue(measures[field]) && !(Number(measures[field]) > 0)) errors[field] = copy.positiveNumber;
  });
  // The backend needs both halves of the bucket conversion or neither.
  if (hasValue(measures.bulk_density_kg_per_litre) !== hasValue(measures.bucket_volume_litres)) {
    errors.bucket_volume_litres = errors.bucket_volume_litres ?? copy.bucketPair;
  }
  return errors;
}

/** Only the fields the farmer filled in; the concentrate rate only applies to the concentrate basis. */
export function toMeasurementPayload(measures) {
  const payload = { quantity_basis: measures.quantity_basis };
  NUMERIC_FIELDS.forEach((field) => {
    if (field === 'concentrate_kg_per_head_day' && measures.quantity_basis !== 'concentrate') return;
    if (hasValue(measures[field])) payload[field] = Number(measures[field]);
  });
  return payload;
}
