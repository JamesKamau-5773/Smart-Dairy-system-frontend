import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage, inventoryApi, nutritionApi } from '../../lib/backendApi';
import { offlineFailureMessage } from '../../lib/offlinePolicy';
import { reportError } from '../../lib/telemetry';
import { getListLoadState, hasRowsToShow } from '../../lib/listLoadState';
import { CardSkeletons, ListLoadNotices } from '../../components/ui/ListLoadState';
import { useTenant } from '../../hooks/useTenant';
import { unitConversionsKey, useUnitConversions } from '../../hooks/useUnitConversions';
import { feedCopy } from '../../i18n/feed';

const copy = feedCopy.unitHelpers;

const FIELD = 'w-full bg-surface-raised border border-ink/20 text-ink font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all placeholder:font-medium placeholder:text-ink-muted/50';
const LABEL = 'block text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2';

const EmptyConversionsState = () => (
  <div className="border border-dashed border-ink/15 bg-surface-warm/30 rounded-xl p-8 flex flex-col items-center justify-center text-center animate-reveal">
    <h4 className="text-ink font-bold text-sm mb-1">{copy.emptyTitle}</h4>
    <p className="text-xs text-ink-muted">{copy.emptyText}</p>
  </div>
);

// No remove button: the backend can't delete a unit helper yet (BACKEND_REQUESTS.md, BR-010).
const ConversionRow = ({ conversion, itemName }) => (
  <div className="flex items-center justify-between p-4 bg-surface-raised border border-ink/5 rounded-xl">
    <div>
      <p className="text-sm font-bold text-ink mb-0.5">{itemName ?? copy.unknownItem}</p>
      <p className="text-xs font-medium text-ink-muted">
        1 {conversion.unitName} = {conversion.kgEquivalent ?? '—'} kg
      </p>
    </div>
  </div>
);

/**
 * Unit Helpers: the farm's local measurements (a kasuku, a wheelbarrow) for a stock item, in
 * kilograms. Saved to the backend and used to show feed amounts on barn-floor screens.
 */
export default function UnitConversions() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const [itemId, setItemId] = useState('');
  const [unitName, setUnitName] = useState('');
  const [kgEquivalent, setKgEquivalent] = useState('');
  const [saveError, setSaveError] = useState('');

  const conversionsQuery = useUnitConversions();
  const loadState = getListLoadState(conversionsQuery);
  const conversions = Array.isArray(conversionsQuery.data) ? conversionsQuery.data : [];

  // The farm's stock items (same query and cache as the Stock page).
  const itemsQuery = useQuery({
    queryKey: ['inventory-items', tenantId, farmId, { includeArchived: false }],
    queryFn: () => inventoryApi.listItems({ includeArchived: false }),
    enabled: !!tenantId && !!farmId,
  });
  const itemsState = getListLoadState(itemsQuery);
  const items = useMemo(() => (Array.isArray(itemsQuery.data) ? itemsQuery.data : []), [itemsQuery.data]);
  const itemNameById = useMemo(() => new Map(items.map((item) => [String(item.id), item.name])), [items]);

  const saveConversion = useMutation({
    mutationFn: (payload) => nutritionApi.saveConversion(payload),
    onMutate: () => setSaveError(''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitConversionsKey(tenantId, farmId) });
      setItemId('');
      setUnitName('');
      setKgEquivalent('');
    },
    onError: (error) => {
      reportError(error, { where: 'UnitConversions.save' });
      setSaveError(offlineFailureMessage(error, copy.offlineFailed)
        ?? getApiErrorMessage(error, copy.saveFailed));
    },
  });

  const kg = parseFloat(kgEquivalent);
  const isFormValid = Boolean(itemId) && unitName.trim() !== '' && Number.isFinite(kg) && kg > 0;

  const handleSave = (event) => {
    event.preventDefault();
    if (saveConversion.isPending || !isFormValid) return;
    saveConversion.mutate({ itemId: Number(itemId), unitName: unitName.trim(), kgEquivalent: kg });
  };

  return (
    <div className="min-h-[80vh] flex flex-col relative pb-12 animate-reveal">
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 space-y-8 pt-6">
        <div className="border-b border-ink/10 pb-4">
          <h1 className="font-black text-3xl text-ink m-0">{copy.title}</h1>
          <p className="text-sm text-ink-muted mt-2">
            {copy.subtitle}
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-ink/10 p-6 md:p-8">
          <div className="mb-6 text-ink">
            <h2 className="text-sm font-bold uppercase tracking-widest">{copy.addTitle}</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="unit-item" className={LABEL}>{copy.item}</label>
                <select
                  id="unit-item"
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  disabled={!hasRowsToShow(itemsState) || items.length === 0}
                  className={`${FIELD} cursor-pointer appearance-none disabled:opacity-60`}
                  required
                >
                  <option value="">{itemsState === 'loading' ? copy.loadingItems : copy.chooseItem}</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                {hasRowsToShow(itemsState) && items.length === 0 && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {copy.addItemBefore}<Link to="/operations/inventory" className="font-semibold text-brand underline">{copy.stock}</Link>{copy.addItemAfter}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="unit-name" className={LABEL}>{copy.unitName}</label>
                <input
                  id="unit-name"
                  type="text"
                  value={unitName}
                  onChange={(event) => setUnitName(event.target.value)}
                  placeholder={copy.unitPlaceholder}
                  className={FIELD}
                  required
                />
              </div>

              <div>
                <label htmlFor="unit-kg" className={LABEL}>{copy.holds(unitName.trim())}</label>
                <div className="relative">
                  <input
                    id="unit-kg"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    value={kgEquivalent}
                    onChange={(event) => setKgEquivalent(event.target.value)}
                    placeholder={copy.kgPlaceholder}
                    className={FIELD}
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted pointer-events-none">kg</div>
                </div>
              </div>
            </div>

            {itemsState !== 'ready' && itemsState !== 'loading' && (
              <div className="overflow-hidden rounded-xl border border-ink/10">
                <ListLoadNotices state={itemsState} label={copy.itemsLabel} error={itemsQuery.error} onRetry={itemsQuery.refetch} />
              </div>
            )}
            {saveError && <p role="alert" className="text-sm font-semibold text-danger">{saveError}</p>}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!isFormValid || saveConversion.isPending}
                className="btn-command min-w-[160px] px-8 py-3.5 rounded-xl flex items-center justify-center disabled:opacity-60 transition-all bg-brand text-white hover:bg-brand/90 font-bold"
              >
                {saveConversion.isPending ? copy.saving : copy.save}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-surface rounded-2xl border border-ink/10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-widest">{copy.savedTitle}</h3>
            <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-md">
              {copy.savedCount(hasRowsToShow(loadState) ? conversions.length : '—')}
            </span>
          </div>

          <div className="space-y-3">
            {loadState !== 'ready' && (
              <div className="overflow-hidden rounded-xl border border-ink/10">
                <ListLoadNotices state={loadState} label={copy.listLabel} error={conversionsQuery.error} onRetry={conversionsQuery.refetch} />
                {loadState === 'loading' && <div aria-busy="true"><CardSkeletons rows={2} /></div>}
              </div>
            )}
            {hasRowsToShow(loadState) && (conversions.length === 0 ? (
              <EmptyConversionsState />
            ) : (
              conversions.map((conversion) => (
                <ConversionRow key={conversion.id} conversion={conversion} itemName={itemNameById.get(String(conversion.itemId))} />
              ))
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
