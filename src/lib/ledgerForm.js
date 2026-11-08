// The ledger's income and expense form: the categories the backend accepts, a
// sensible starting cost class for each, and what's still missing before saving.

// Backend transaction categories (finance API). Labels are what farmers see.
export const INCOME_CATEGORIES = Object.freeze([
  ['Milk Sale', 'Milk sales'],
  ['Livestock Sale', 'Livestock sales'],
  ['Other Income', 'Other income'],
]);

export const EXPENSE_CATEGORIES = Object.freeze([
  ['Feed Purchase', 'Feed and supplies'],
  ['Labor / Wages', 'Labour and wages'],
  ['Utilities', 'Utilities'],
  ['Vet Fees', 'Veterinary services'],
  ['Equipment Maintenance', 'Equipment maintenance'],
  ['Transport', 'Transport'],
  ['Other', 'Other expense'],
]);

export const COST_CLASSES = Object.freeze([
  ['production_cost', 'Direct farm costs'],
  ['operating_cost', 'General running costs'],
  ['customer_acquisition', 'Selling and delivery'],
  ['capital_expenditure', 'Major purchases (assets)'],
]);

export const COST_CLASS_DEFINITIONS = Object.freeze([
  ['production_cost', 'Money spent directly on the cows and milk production, such as feeds, supplements, AI services, and veterinary bills.'],
  ['operating_cost', 'Day-to-day farm overhead not directly tied to a specific cow, like electricity, water, fuel, and permanent staff wages.'],
  ['customer_acquisition', 'Costs related to getting your milk to the buyer, including transport, packaging, marketing, and vendor fees.'],
  ['capital_expenditure', 'Big, long-term investments for the farm, such as buying new machinery, building sheds, or purchasing new livestock.'],
]);

// A starting point so farmers don't have to know accounting classes; they can
// change it, and the backend validates whatever is sent.
const DEFAULT_COST_CLASS = Object.freeze({
  'Feed Purchase': 'production_cost',
  'Vet Fees': 'production_cost',
  'Labor / Wages': 'operating_cost',
  Utilities: 'operating_cost',
  'Equipment Maintenance': 'operating_cost',
  Transport: 'customer_acquisition',
  Other: 'operating_cost',
});

export const defaultCostClass = (category) => DEFAULT_COST_CLASS[category] ?? 'operating_cost';

const isBlank = (value) => !String(value ?? '').trim();

/**
 * Plain names of what still has to be filled in before saving, so a disabled
 * Save button can say why. Empty when the form can be sent.
 */
export function missingLedgerFields(form, transactionType, { mpesaCodeError } = {}) {
  const missing = [];
  if (!form.date) missing.push('the date');
  if (!(Number(form.amount) > 0)) missing.push('the amount');

  if (transactionType === 'income') {
    if (form.incomePayerType === 'customer' ? !form.customer_id : isBlank(form.income_source)) missing.push(form.incomePayerType === 'customer' ? 'the customer' : 'who paid');
    if (form.incomePayerType === 'customer' && form.paymentMethod !== 'Cash' && isBlank(form.reference_code)) missing.push('the payment reference');
    if (mpesaCodeError) missing.push('a valid M-Pesa code');
    return missing;
  }

  if (isBlank(form.party)) missing.push('the supplier or payee');
  if (isBlank(form.item_name)) missing.push('what was bought');
  if (form.category === 'Feed Purchase' && !(Number(form.quantity) > 0)) missing.push('the quantity');
  // Animals are optional; if some are chosen, the backend needs the cost type too.
  if (form.animal_ids?.length > 0 && !form.animal_cost_type) missing.push('how the cost applies to the chosen animals');
  return missing;
}
