import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi, getApiErrorMessage, herdApi } from '../../lib/backendApi';
import { QUEUED_OFFLINE_MESSAGE, isQueuedOffline, offlineFailureMessage } from '../../lib/offlinePolicy';
import { missingLedgerFields } from '../../lib/ledgerForm';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { useInvalidateLedger } from '../../hooks/usePeriodTotals';
import { useFormDraft } from '../../hooks/useFormDraft';
import { todayLocalIso } from '../../lib/localDate';
import { getMpesaCodeError } from '../../lib/validation';
import { buildLedgerEntryPayload } from '../../lib/ledgerEntryPayload';
import { formatCowIdentity } from '../../lib/cowIdentity';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import DraftRestoredNotice from '../ui/DraftRestoredNotice';
import DateField from '../ui/DateField';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

// A ledger draft is worth keeping once any amount, party, item or note has been typed.
const isLedgerDraftEmpty = (values) => !['amount', 'party', 'item_name', 'description', 'reference_code', 'customer_id', 'income_source']
  .some((field) => String(values?.[field] ?? '').trim());

/** Log income (or a customer payment) or an expense. Saves a draft until it closes. */
export default function LedgerEntryFormModal({ onClose: closeModal, transactionType, farmId, tenantId }) {
  const queryClient = useQueryClient();
  const categories = useLedgerCategories(tenantId, farmId);
  const [isAnimalListOpen, setIsAnimalListOpen] = useState(false);
  const [formData, setFormData] = useState(() => ({
    date: todayLocalIso(),
    amount: '',
    category: transactionType === 'income' ? 'Milk Sale' : 'Feed Purchase',
    incomePayerType: 'customer',
    customer_id: '',
    income_source: '',
    party: '',
    item_name: '',
    quantity: '',
    quantity_unit: 'kg',
    cost_class: 'production_cost',
    paymentMethod: 'M-Pesa',
    animal_ids: [],
    animal_cost_type: '',
    reference_code: '',
    description: '',
  }));
  const [blankForm] = useState(formData);
  const ledgerDraft = useFormDraft(`ledger-${transactionType}`, formData, setFormData, { isEmpty: isLedgerDraftEmpty });
  // Any close (saved, cancelled or dismissed) ends the draft; only a reload or crash keeps it.
  const onClose = () => {
    ledgerDraft.clearDraft();
    closeModal();
  };

  const invalidateLedger = useInvalidateLedger();
  const { data: customers = [] } = useQuery({
    queryKey: QUERY_KEYS.CUSTOMERS(tenantId, farmId),
    queryFn: () => financeApi.listCustomers(),
    enabled: !!tenantId && !!farmId && transactionType === 'income',
  });
  const { data: animals = [] } = useQuery({
    queryKey: ['herd', tenantId],
    queryFn: () => herdApi.list(),
    enabled: !!tenantId && transactionType === 'expense',
  });

  const mutation = useMutation({
    mutationFn: (newEntry) => {
      if (transactionType === 'income' && formData.incomePayerType === 'customer') {
        return financeApi.recordCustomerPayment(newEntry.customer_id, {
          amount: newEntry.amount,
          category: newEntry.category,
          ...(newEntry.reference_code?.trim() ? { reference_code: newEntry.reference_code.trim().toUpperCase() } : {}),
          note: newEntry.description,
          date: newEntry.date,
          payment_method: newEntry.payment_method,
        });
      }
      return financeApi.createLedgerEntry(newEntry);
    },
    onSuccess: (result) => {
      invalidateLedger();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS(tenantId, farmId) });
      if (isQueuedOffline(result)) {
        toast(QUEUED_OFFLINE_MESSAGE);
      } else {
        toast.success(isCustomerPayment ? 'Customer payment recorded.' : transactionType === 'income' ? 'Income recorded.' : 'Expense recorded.');
      }
      onClose();
    },
    onError: (error) => {
      toast.error(
        (isCustomerPayment && offlineFailureMessage(error, 'This payment was not recorded.'))
          || getApiErrorMessage(error, `The ${transactionType === 'income' ? 'income' : 'expense'} was not saved. Check the details and try again.`),
      );
    },
  });

  // The cost class follows the category until the farmer chooses one themselves.
  const [costClassChosen, setCostClassChosen] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cost_class') setCostClassChosen(true);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'category' && value !== 'Feed Purchase' ? { quantity: '' } : {}),
      ...(name === 'category' && transactionType === 'expense' && !costClassChosen ? { cost_class: categories.defaultCostClass(value) } : {}),
    }));
  };

  const setDate = (date) => setFormData((prev) => ({ ...prev, date }));

  const handleAnimalToggle = (animalId) => {
    setFormData((prev) => {
      const selectedAnimals = prev.animal_ids.includes(animalId)
        ? prev.animal_ids.filter((id) => id !== animalId)
        : [...prev.animal_ids, animalId];

      return {
        ...prev,
        animal_ids: selectedAnimals,
        animal_cost_type: selectedAnimals.length === 0 ? '' : prev.animal_cost_type,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const costClass = transactionType === 'expense' ? categories.resolveCostClass(formData.category, formData.cost_class) : formData.cost_class;
    mutation.mutate(buildLedgerEntryPayload({ ...formData, cost_class: costClass }, transactionType));
  };

  const isCustomerPayment = transactionType === 'income' && formData.incomePayerType === 'customer';
  const isPaymentReferenceRequired = isCustomerPayment && formData.paymentMethod !== 'Cash';
  const mpesaCodeError = isCustomerPayment && formData.paymentMethod === 'M-Pesa' ? getMpesaCodeError(formData.reference_code) : null;
  const requiresCommodityQuantity = transactionType === 'expense' && formData.category === 'Feed Purchase';
  const hasSelectedAnimals = formData.animal_ids.length > 0;
  const isAnimalAllocationIncomplete = hasSelectedAnimals !== Boolean(formData.animal_cost_type);
  const missingFields = missingLedgerFields(formData, transactionType, { mpesaCodeError });
  const isFormInvalid = missingFields.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-brand-dark/50 p-3 animate-reveal-fast touch-pan-y sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-label={transactionType === 'income' ? 'Record income or customer payment' : 'Log new expense'} className="my-auto flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-lg bg-card shadow-2xl sm:max-h-[90dvh]">
        <div className="flex shrink-0 items-center justify-between border-b p-4 sm:p-5">
          <h3 className="text-lg font-bold text-ink">
            {transactionType === 'income' ? 'Record Income or Customer Payment' : 'Log New Expense'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-ink-100 text-ink-muted" aria-label="Close transaction form">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 touch-pan-y sm:p-6">
            {ledgerDraft.restored && (
              <DraftRestoredNotice
                onStartOver={() => { ledgerDraft.clearDraft(); setFormData(blankForm); }}
                onDismiss={ledgerDraft.dismissRestored}
              />
            )}
            {transactionType === 'income' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateField label="Date received" name="date" value={formData.date} max={todayLocalIso()} onChange={setDate} required className="form-control" />
                  <label className="form-control"><span className="label-text">Income amount (KES)</span><input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder="e.g., 5000" required /></label>
                </div>
                <fieldset className="space-y-2">
                  <legend className="label-text">Payment source</legend>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-ink/10 bg-surface-raised p-1">
                    <button type="button" onClick={() => setFormData((current) => ({ ...current, incomePayerType: 'customer', income_source: '' }))} className={formData.incomePayerType === 'customer' ? 'btn-primary' : 'btn-secondary'}>Customer payment</button>
                    <button type="button" onClick={() => setFormData((current) => ({ ...current, incomePayerType: 'other', customer_id: '' }))} className={formData.incomePayerType === 'other' ? 'btn-primary' : 'btn-secondary'}>Other payer</button>
                  </div>
                </fieldset>
                {formData.incomePayerType === 'customer' ? (
                  <label className="form-control">
                    <span className="label-text">Customer making payment</span>
                    <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="input-machined" required>
                      <option value="" disabled>Select who paid</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="form-control"><span className="label-text">Payer or income source</span><input type="text" name="income_source" value={formData.income_source} onChange={handleChange} className="input-machined" placeholder="e.g., County show or walk-in buyer" required /></label>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control">
                    <span className="label-text">Income source</span>
                    <select name="category" value={formData.category} onChange={handleChange} className="input-machined" required>
                      {categories.income.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="form-control">
                    <span className="label-text">Payment received via</span>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                      <option value="M-Pesa">M-Pesa</option><option value="Cash">Cash</option><option value="Bank">Bank transfer</option><option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <label className="form-control"><span className="label-text">Payment reference{isPaymentReferenceRequired ? ' (required)' : ' (optional)'}</span><input type="text" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined uppercase" placeholder={formData.paymentMethod === 'Cash' ? 'Optional for cash payments' : 'M-Pesa or bank transaction code'} required={isPaymentReferenceRequired} aria-invalid={Boolean(mpesaCodeError)} aria-describedby={mpesaCodeError ? 'reference-code-error' : undefined} />{mpesaCodeError && <span id="reference-code-error" className="mt-1.5 block text-xs text-danger-900">{mpesaCodeError}</span>}</label>
                <label className="form-control"><span className="label-text">Income notes</span><textarea name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder="What was this payment for?" /></label>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateField label="Expense date" name="date" value={formData.date} max={todayLocalIso()} onChange={setDate} required className="form-control" />
                  <label className="form-control"><span className="label-text">Amount paid (KES)</span><input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder="e.g., 2500" required /></label>
                </div>
                <label className="form-control"><span className="label-text">Supplier or payee</span><input type="text" name="party" value={formData.party} onChange={handleChange} className="input-machined" placeholder="e.g., Agrovet Store or employee name" required /></label>
                <label className="form-control"><span className="label-text">Expense category</span><select name="category" value={formData.category} onChange={handleChange} className="input-machined" required>{categories.expense.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="form-control"><span className="label-text">{requiresCommodityQuantity ? 'Item / commodity name' : 'Expense or service description'}</span><input type="text" name="item_name" value={formData.item_name} onChange={handleChange} className="input-machined" placeholder={requiresCommodityQuantity ? 'e.g., Dairy Meal' : 'e.g., Veterinary visit or vaccination'} required /></label>
                {requiresCommodityQuantity && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="form-control"><span className="label-text">Quantity</span><input type="number" min="0.001" step="0.001" name="quantity" value={formData.quantity} onChange={handleChange} className="input-machined" placeholder="e.g., 50" required /></label>
                    <label className="form-control"><span className="label-text">Unit</span><select name="quantity_unit" value={formData.quantity_unit} onChange={handleChange} className="input-machined" required><option value="kg">Kilograms (kg)</option><option value="g">Grams (g)</option><option value="L">Litres (L)</option><option value="mL">Millilitres (mL)</option><option value="bags">Bags</option><option value="pieces">Pieces</option><option value="packs">Packs</option><option value="units">Units</option></select></label>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <div className="form-control">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="label-text">Cost classification</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="inline-flex text-ink-muted transition-colors hover:text-brand" aria-label="Explain cost classifications">
                            <Info size={14} aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={6} className="w-80 space-y-3">
                          <div className="space-y-2 text-xs leading-relaxed text-ink-muted">
                            {categories.costClasses.map(([value, label]) => (
                              <div key={value}>
                                <p className="font-bold text-ink">{label}</p>
                                <p>{categories.describe(value)}</p>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <select name="cost_class" value={categories.resolveCostClass(formData.category, formData.cost_class)} onChange={handleChange} className="input-machined" required>
                      {categories.costClasses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <label className="form-control">
                  <span className="label-text">Payment method used</span>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                    <option value="M-Pesa">M-Pesa</option><option value="Cash">Cash</option><option value="Bank">Bank transfer</option><option value="Other">Other</option>
                  </select>
                </label>
                <label className="form-control"><span className="label-text">Receipt or invoice number</span><input type="text" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined" placeholder="Supplier receipt, invoice, or transaction code" /></label>
                <label className="form-control"><span className="label-text">Purchase or expense details</span><textarea name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder="Describe the goods or services purchased" /></label>
                <div className="grid grid-cols-1 gap-4 border-t border-ink/10 pt-4">
                  <div className="form-control">
                    <span className="label-text">Animals for this expense (optional)</span>
                    <button
                      type="button"
                      onClick={() => setIsAnimalListOpen((current) => !current)}
                      aria-expanded={isAnimalListOpen}
                      aria-controls="animals-for-expense-list"
                      className="mt-1 flex w-full items-center justify-between rounded-lg border border-ink/15 bg-card px-3 py-2.5 text-left text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/20 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                      <span>Select Animals ({formData.animal_ids.length} selected)</span>
                      {isAnimalListOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                    </button>
                    {isAnimalListOpen && (
                      <div id="animals-for-expense-list" className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-ink/15 bg-card">
                        {animals.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-ink-muted">No animals available</p>
                        ) : (
                          animals.map((animal) => (
                            <label key={animal.id} className="flex cursor-pointer items-center gap-3 py-2 px-3 transition-colors hover:bg-brand-50 focus-within:bg-brand-50">
                              <input
                                type="checkbox"
                                checked={formData.animal_ids.includes(animal.id)}
                                onChange={() => handleAnimalToggle(animal.id)}
                                className="h-4 w-4 rounded border-ink/15 text-brand-700 focus:ring-brand-500"
                              />
                              <span className="text-sm text-ink">{formatCowIdentity(animal)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="form-control">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="label-text">Animal cost type</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="inline-flex text-ink-muted transition-colors hover:text-brand" aria-label="Explain cost classifications">
                            <Info size={14} aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={6} className="w-80 space-y-3">
                          <div className="space-y-2 text-xs leading-relaxed text-ink-muted">
                            {categories.costClasses.map(([value, label]) => (
                              <div key={value}>
                                <p className="font-bold text-ink">{label}</p>
                                <p>{categories.describe(value)}</p>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <select name="animal_cost_type" value={formData.animal_cost_type} onChange={handleChange} className="input-machined" disabled={!hasSelectedAnimals}>
                      <option value="">Select cost type</option>
                      <option value="PURCHASE">Purchase</option><option value="CALF_FEED">Calf feed</option><option value="HEIFER_FEED">Heifer feed</option><option value="BREEDING">Breeding</option><option value="VETERINARY">Veterinary</option><option value="LABOR">Labor</option><option value="HOUSING">Housing</option><option value="OVERHEAD">Overhead</option><option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                {!hasSelectedAnimals && <p className="text-xs text-ink-muted">Choose cows only if this cost was for specific animals, such as treatment or AI.</p>}
                {hasSelectedAnimals && isAnimalAllocationIncomplete && <p className="text-xs text-brand-dark">Select a cost type to assign this expense to the selected cows.</p>}
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 rounded-b-lg border-t border-ink/10 bg-ink-50 p-4">
            {isFormInvalid && !mutation.isPending && (
              <p id="ledger-missing" className="text-xs text-ink-muted">To save, add {missingFields.join(', ')}.</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={mutation.isPending || isFormInvalid} aria-describedby={isFormInvalid ? 'ledger-missing' : undefined}>
                {mutation.isPending ? 'Saving...' : `Log ${transactionType === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
