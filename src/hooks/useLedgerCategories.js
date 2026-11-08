import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../lib/backendApi';
import { COST_CLASSES, COST_CLASS_DEFINITIONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, defaultCostClass as builtInDefault } from '../lib/ledgerForm';

// The server's codes for the same four cost classes, so the help text still applies.
const DEFINITION_KEY = { COGS: 'production_cost', OPERATING: 'operating_cost', CUSTOMER_ACQUISITION: 'customer_acquisition', CAPITAL: 'capital_expenditure' };
const definitions = Object.fromEntries(COST_CLASS_DEFINITIONS);

const toPairs = (items) => (Array.isArray(items) ? items.map((item) => [item.value, item.label ?? item.value]) : null);

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
  const income = toPairs(data?.revenue) ?? INCOME_CATEGORIES;
  const expense = toPairs(data?.expense) ?? EXPENSE_CATEGORIES;
  const costClasses = toPairs(data?.cost_classes) ?? COST_CLASSES;
  const serverDefaults = Object.fromEntries((data?.expense ?? []).map((item) => [item.value, item.default_cost_class]));

  const defaultCostClass = (category) => serverDefaults[category] ?? (data ? costClasses[0]?.[0] : builtInDefault(category));
  // A value from before the list loaded may not be one of the server's codes.
  const resolveCostClass = (category, value) => (costClasses.some(([code]) => code === value) ? value : defaultCostClass(category));
  const describe = (code) => definitions[DEFINITION_KEY[code] ?? code] ?? '';

  return { income, expense, costClasses, defaultCostClass, resolveCostClass, describe, isFromServer: Boolean(data) };
}
