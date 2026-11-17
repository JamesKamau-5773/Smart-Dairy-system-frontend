import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../lib/backendApi';
import { COST_CLASSES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, defaultCostClass as builtInDefault } from '../lib/ledgerForm';
import { financeCopy } from '../i18n/finance';

// The server's codes for the same four cost classes, so the help text still applies.
const DEFINITION_KEY = { COGS: 'production_cost', OPERATING: 'operating_cost', CUSTOMER_ACQUISITION: 'customer_acquisition', CAPITAL: 'capital_expenditure' };

const toPairs = (items) => (Array.isArray(items) ? items.map((item) => [item.value, item.label ?? item.value]) : null);
// A known code is shown in the chosen language; any other keeps the backend's own label.
const localize = (pairs, labels) => pairs.map(([code, label]) => [code, labels[code] ?? label]);

/**
 * Ledger categories and cost classes from the backend (`GET /finance/categories`),
 * which validates entries against the same list. The built-in list is used only
 * while it loads or if a backend doesn't offer the endpoint.
 */
export function useLedgerCategories(tenantId, farmId) {
  const query = useQuery({
    queryKey: ['ledger-categories', tenantId, farmId],
    queryFn: () => financeApi.categories(),
    enabled: !!tenantId && !!farmId,
    staleTime: 60 * 60 * 1000,
  });
  const data = query.data;
  const words = financeCopy.ledgerCategories;
  const income = localize(toPairs(data?.revenue) ?? INCOME_CATEGORIES, words.income);
  const expense = localize(toPairs(data?.expense) ?? EXPENSE_CATEGORIES, words.expense);
  const costClasses = (toPairs(data?.cost_classes) ?? COST_CLASSES)
    .map(([code, label]) => [code, words.costClasses[DEFINITION_KEY[code] ?? code] ?? label]);
  const serverDefaults = Object.fromEntries((data?.expense ?? []).map((item) => [item.value, item.default_cost_class]));

  const defaultCostClass = (category) => serverDefaults[category] ?? (data ? costClasses[0]?.[0] : builtInDefault(category));
  // A value from before the list loaded may not be one of the server's codes.
  const resolveCostClass = (category, value) => (costClasses.some(([code]) => code === value) ? value : defaultCostClass(category));
  const describe = (code) => words.costClassHelp[DEFINITION_KEY[code] ?? code] ?? '';

  return { income, expense, costClasses, defaultCostClass, resolveCostClass, describe, isFromServer: Boolean(data) };
}
