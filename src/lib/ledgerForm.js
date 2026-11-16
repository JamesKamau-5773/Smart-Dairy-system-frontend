// The ledger's income and expense form: the categories the backend accepts, a
// sensible starting cost class for each, and what's still missing before saving.

import { financeCopy } from '../i18n/finance';

// Backend transaction categories (finance API). These English labels are the fallback list;
// screens show labels in the chosen language (useLedgerCategories).
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
  const words = financeCopy.ledgerForm.missing;
  const missing = [];
  if (!form.date) missing.push(words.date);
  if (!(Number(form.amount) > 0)) missing.push(words.amount);

  if (transactionType === 'income') {
    if (form.incomePayerType === 'customer' ? !form.customer_id : isBlank(form.income_source)) missing.push(form.incomePayerType === 'customer' ? words.customer : words.payer);
    if (form.incomePayerType === 'customer' && form.paymentMethod !== 'Cash' && isBlank(form.reference_code)) missing.push(words.reference);
    if (mpesaCodeError) missing.push(words.mpesaCode);
    return missing;
  }

  if (isBlank(form.party)) missing.push(words.payee);
  if (isBlank(form.item_name)) missing.push(words.item);
  if (form.category === 'Feed Purchase' && !(Number(form.quantity) > 0)) missing.push(words.quantity);
  // Animals are optional; if some are chosen, the backend needs the cost type too.
  if (form.animal_ids?.length > 0 && !form.animal_cost_type) missing.push(words.costType);
  return missing;
}
