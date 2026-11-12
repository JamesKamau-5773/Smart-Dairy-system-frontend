import { useState } from 'react';
import { ClipboardList, Minus, Plus, CheckCircle2, PackageCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../lib/backendApi';
import { getFeedErrorMessage } from '../../lib/feedErrors';
import { EMPTY_RESTOCK, validateRestock } from '../../lib/restockForm';
import { feedCopy } from '../../i18n/feed';
import BaseModal from '../ui/BaseModal';

const { restock: copy } = feedCopy;
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand/20';

export default function StandardDeliveryModal({ isOpen, onClose, item, onRestock, tenantId, farmId }) {
  const [form, setForm] = useState(EMPTY_RESTOCK);
  const [errors, setErrors] = useState({});
  // The parent mounts this dialog fresh for each opening, so state starts clean.
  const [stagedItem, setStagedItem] = useState(item ?? null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch critical items directly from the new backend endpoint
  const { data: quickSelectOptions = [], isLoading } = useQuery({
    queryKey: ['quick-restock-items', tenantId, farmId],
    queryFn: () => inventoryApi.getQuickRestockItems(),
    // Only fetch when the modal is open and we are in the general restock mode (no specific item passed)
    enabled: isOpen && !item,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!isOpen) return null;

  const selectedItem = item ?? stagedItem;
  const selectedStock = selectedItem?.stock ?? {};

  const handleQuickSelect = (option) => {
    setStagedItem(option);
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleConfirm = async () => {
    if (!onRestock || !selectedItem) return;
    const nextErrors = validateRestock(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await onRestock(selectedItem, form);
      onClose();
    } catch (error) {
      setSubmitError(getFeedErrorMessage(error, 'Could not record this delivery. Check the quantity and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // The stepper and bag buttons still work on whole amounts; the field takes any decimal.
  const quantity = Number(form.quantity) || 0;
  const increaseAmount = (val) => setField('quantity', String(Math.round((quantity + val) * 1000) / 1000));
  const decreaseAmount = () => setField('quantity', String(Math.max(0, Math.round((quantity - 1) * 1000) / 1000)));
  const unitLabel = selectedStock.unit ?? selectedItem?.unit ?? 'units';

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={item ? 'Restock resource' : 'Log standard batch'}
      icon={<ClipboardList size={20} />}
      closeLabel="Close restock form"
      footerActions={(
        <>
          <button 
            type="button" 
            onClick={onClose}
            className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={quantity <= 0 || !selectedItem || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all  bg-brand text-white hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={16} />
            Confirm Delivery
          </button>
        </>
      )}
    >
      {/* SECTION 1: WHAT ARRIVED */}
      <div className="mb-8">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
          1. What Arrived?
        </label>

        {item ? (
          /* TARGETED RESTOCK VIEW (User clicked a specific row) */
          <div className="p-5 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PackageCheck size={16} className="text-brand" />
                <span className="font-black text-brand text-lg">{selectedItem?.name ?? 'Selected resource'}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-6">
                SKU: {selectedItem?.sku || 'Not assigned'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</div>
              <div className="font-black text-slate-700">
                {selectedStock.value ?? 0} {selectedStock.unit ?? selectedItem?.unit ?? 'units'}
              </div>
            </div>
          </div>
        ) : (
          /* GENERAL RESTOCK VIEW (User clicked "Add to Feedstore" at the top) */
          <div className="quick-select-container mb-6">
            <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-2 block">
              Priority Restock
            </label>

            {isLoading ? (
              <div className="text-sm text-slate-400">Loading priorities...</div>
            ) : quickSelectOptions.length === 0 ? (
              <div className="text-sm text-slate-400">All stock levels are healthy!</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {quickSelectOptions.map((option) => {
                  const isSelected = stagedItem?.id === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleQuickSelect(option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100'
                      }`}
                    >
                      {option.name} 
                      <span className="opacity-75">
                        ({option.currentStock}{option.unit})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: HOW MUCH WAS DELIVERED */}
      <div className="border border-slate-100 rounded-2xl p-8 flex flex-col items-center bg-slate-50/50">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
          2. How Much Was Delivered?
        </label>

        <div className="flex items-center justify-center gap-8 mb-8">
          <button 
            type="button"
            onClick={decreaseAmount}
            className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all "
          >
            <Minus size={20} />
          </button>

          <div className="flex min-w-[100px] items-baseline justify-center gap-2">
            <input
              aria-label={`${copy.quantityLabel} (${unitLabel})`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(event) => setField('quantity', event.target.value)}
              placeholder="0"
              aria-invalid={errors.quantity ? true : undefined}
              className="w-28 bg-transparent text-center text-3xl font-black tabular-nums tracking-tighter text-slate-800 outline-none"
            />
            <span className="text-xl font-bold text-slate-400" aria-hidden="true">{unitLabel}</span>
          </div>

          <button 
            type="button"
            onClick={() => increaseAmount(1)}
            className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all "
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => increaseAmount(50)}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50 transition-all "
          >
            + 50kg Bag
          </button>
          <button 
            type="button"
            onClick={() => increaseAmount(70)}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50 transition-all "
          >
            + 70kg Bag
          </button>
        </div>
        {errors.quantity && <p className="mt-4 text-xs font-semibold text-danger">{errors.quantity}</p>}
      </div>

      {/* SECTION 3: PRICE, SUPPLIER AND LEDGER */}
      <div className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.unitCost}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.unitCost}
              onChange={(event) => setField('unitCost', event.target.value)}
              aria-invalid={errors.unitCost ? true : undefined}
              className={fieldClass}
            />
            <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">{copy.unitCostHint}</span>
            {errors.unitCost && <span className="mt-1 block text-xs font-semibold text-danger">{errors.unitCost}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.supplier}</span>
            <input
              value={form.supplierName}
              onChange={(event) => setField('supplierName', event.target.value)}
              placeholder={copy.supplierPlaceholder}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.recordExpense}
            onChange={(event) => setField('recordExpense', event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand"
          />
          <span>
            <span className="block font-semibold">{copy.recordExpense}</span>
            <span className="block text-xs text-slate-500">{copy.recordExpenseWarning}</span>
          </span>
        </label>
        {submitError && <p role="alert" className="text-xs font-semibold text-danger">{submitError}</p>}
      </div>
    </BaseModal>
  );
}
