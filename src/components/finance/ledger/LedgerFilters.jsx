import ToolbarDateRange from '../../data/ToolbarDateRange';
import { Toolbar, ToolbarSearch, ToolbarSelect } from '../../data/Toolbar';
import { LEDGER_TYPES } from '../../../hooks/useLedgerFilters';
import { financeCopy } from '../../../i18n/finance';

/**
 * The Ledger's filter fields, in the order every filter panel uses: Search → selects → date
 * range. Rendered inside FilterPanel; the state comes from useLedgerFilters.
 *
 * filters:    useLedgerFilters() result
 * categories: { income: [[code, label]], expense: [[code, label]] } (useLedgerCategories)
 * maxDate:    the latest date the range may end on (today)
 * layout:     'row' (desktop) | 'stacked' (phones and tablets: labelled, two columns)
 */
export default function LedgerFilters({ filters, categories, maxDate, layout = 'row' }) {
  const copy = financeCopy.ledger;
  const { values } = filters;
  const typeOptions = LEDGER_TYPES.map((type) => [type, copy.types[type]]);
  // Only the chosen type's categories; both lists for "All types".
  const categoryList = values.type === 'revenue' ? categories.income
    : values.type === 'expense' ? categories.expense
      : [...categories.income, ...categories.expense];
  const categoryOptions = [['all', copy.allCategories], ...new Map(categoryList).entries()];

  return (
    <Toolbar layout={layout}>
      <ToolbarSearch label={copy.search} value={values.search} onChange={filters.setSearch} placeholder={copy.searchPlaceholder} />
      <ToolbarSelect label={copy.type} value={values.type} onChange={filters.setType} options={typeOptions} />
      <ToolbarSelect label={copy.category} value={values.category} onChange={filters.setCategory} options={categoryOptions} />
      <ToolbarDateRange range={filters.range} onChange={filters.setRange} maxDate={maxDate} />
    </Toolbar>
  );
}
