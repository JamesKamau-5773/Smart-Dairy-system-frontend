import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import toast from 'react-hot-toast';
import { financeApi, getApiErrorMessage, herdApi } from '../../lib/backendApi';
import { queuedOfflineMessage, isQueuedOffline, offlineFailureMessage } from '../../lib/offlinePolicy';
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
import FieldError from '../ui/FieldError';
import { fieldErrorProps } from '../ui/fieldErrorProps';
import { useServerFieldErrors } from '../../hooks/useServerFieldErrors';
import { financeCopy } from '../../i18n/finance';
// A ledger draft is worth keeping once any amount, party, item or note has been typed.
const isLedgerDraftEmpty = (values) => !['amount', 'party', 'item_name', 'description', 'reference_code', 'customer_id', 'income_source']
  .some((field) => String(values?.[field] ?? '').trim());

// The backend's ledger fields, by this form's names, for showing its errors per input.
const SERVER_FIELDS = Object.freeze({ fieldMap: { payment_method: 'paymentMethod', paid_to: 'party', note: 'description' } });

/** Log income (or a customer payment) or an expense. Saves a draft until it closes. */
export default function LedgerEntryFormModal({ onClose: closeModal, transactionType, farmId, tenantId }) {
  const copy = financeCopy.ledgerForm;
  const methods = financeCopy.paymentMethods;
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
    queryKey: QUERY_KEYS.COWS(tenantId, farmId),
    queryFn: () => herdApi.list(),
    enabled: !!tenantId && !!farmId && transactionType === 'expense',
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
        toast(queuedOfflineMessage());
      } else {
        toast.success(isCustomerPayment ? copy.paymentRecorded : transactionType === 'income' ? copy.incomeRecorded : copy.expenseRecorded);
      }
      onClose();
    },
    onError: (error) => {
      toast.error(
        (isCustomerPayment && offlineFailureMessage(error, copy.paymentNotRecorded))
          || getApiErrorMessage(error, copy.notSaved(transactionType === 'income')),
      );
    },
  });

  const server = useServerFieldErrors(mutation.error, SERVER_FIELDS);
  const fieldError = server.errorFor;

  // The cost class follows the category until the farmer chooses one themselves.
  const [costClassChosen, setCostClassChosen] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cost_class') setCostClassChosen(true);
    server.dismiss(name);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'category' && value !== 'Feed Purchase' ? { quantity: '' } : {}),
      ...(name === 'category' && transactionType === 'expense' && !costClassChosen ? { cost_class: categories.defaultCostClass(value) } : {}),
    }));
  };

  const setDate = (date) => {
    server.dismiss('date');
    setFormData((prev) => ({ ...prev, date }));
  };

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

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={transactionType === 'income' ? copy.incomeTitle : copy.expenseTitle}
      size="lg"
      closeLabel={copy.close}
      onSubmit={handleSubmit}
      footerActions={(
        <>
          {isFormInvalid && !mutation.isPending && (
            <p id="ledger-missing" className="w-full text-xs text-ink-muted">{copy.toSave(missingFields.join(', '))}</p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              {copy.cancel}
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending || isFormInvalid} aria-describedby={isFormInvalid ? 'ledger-missing' : undefined}>
              {mutation.isPending ? copy.saving : transactionType === 'income' ? copy.logIncome : copy.logExpense}
            </button>
          </div>
        </>
      )}
    >
      <div className="space-y-4">
        {ledgerDraft.restored && (
          <DraftRestoredNotice
            onStartOver={() => { ledgerDraft.clearDraft(); setFormData(blankForm); }}
            onDismiss={ledgerDraft.dismissRestored}
          />
        )}
        {transactionType === 'income' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateField label={copy.dateReceived} name="date" value={formData.date} max={todayLocalIso()} onChange={setDate} required className="form-control" error={fieldError('date')} />
              <label className="form-control"><span className="label-text">{copy.incomeAmount}</span><input type="number" min="0.01" step="0.01" id="ledger-amount" {...fieldErrorProps('ledger-amount', fieldError('amount'))} name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder={copy.incomeAmountPlaceholder} required /><FieldError id="ledger-amount" message={fieldError('amount')} /></label>
            </div>
            <fieldset className="space-y-2">
              <legend className="label-text">{copy.paymentSource}</legend>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-ink/10 bg-surface-raised p-1">
                <button type="button" onClick={() => setFormData((current) => ({ ...current, incomePayerType: 'customer', income_source: '' }))} className={formData.incomePayerType === 'customer' ? 'btn-primary' : 'btn-secondary'}>{copy.customerPayment}</button>
                <button type="button" onClick={() => setFormData((current) => ({ ...current, incomePayerType: 'other', customer_id: '' }))} className={formData.incomePayerType === 'other' ? 'btn-primary' : 'btn-secondary'}>{copy.otherPayer}</button>
              </div>
            </fieldset>
            {formData.incomePayerType === 'customer' ? (
              <label className="form-control">
                <span className="label-text">{copy.payingCustomer}</span>
                <select id="ledger-customer_id" {...fieldErrorProps('ledger-customer_id', fieldError('customer_id'))} name="customer_id" value={formData.customer_id} onChange={handleChange} className="input-machined" required>
                  <option value="" disabled>{copy.selectPayer}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
                <FieldError id="ledger-customer_id" message={fieldError('customer_id')} />
              </label>
            ) : (
              <label className="form-control"><span className="label-text">{copy.payerSource}</span><input type="text" id="ledger-income_source" {...fieldErrorProps('ledger-income_source', fieldError('income_source'))} name="income_source" value={formData.income_source} onChange={handleChange} className="input-machined" placeholder={copy.payerSourcePlaceholder} required /><FieldError id="ledger-income_source" message={fieldError('income_source')} /></label>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text">{copy.incomeSource}</span>
                <select id="ledger-category" {...fieldErrorProps('ledger-category', fieldError('category'))} name="category" value={formData.category} onChange={handleChange} className="input-machined" required>
                  {categories.income.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError id="ledger-category" message={fieldError('category')} />
              </label>
              <label className="form-control">
                <span className="label-text">{copy.receivedVia}</span>
                <select id="ledger-paymentMethod" {...fieldErrorProps('ledger-paymentMethod', fieldError('paymentMethod'))} name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                  <option value="M-Pesa">{methods['M-Pesa']}</option><option value="Cash">{methods.Cash}</option><option value="Bank">{methods.Bank}</option><option value="Other">{methods.Other}</option>
                </select>
                <FieldError id="ledger-paymentMethod" message={fieldError('paymentMethod')} />
              </label>
            </div>
            <label className="form-control"><span className="label-text">{copy.reference(isPaymentReferenceRequired)}</span><input type="text" id="ledger-reference_code" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined uppercase" placeholder={formData.paymentMethod === 'Cash' ? copy.referenceCashPlaceholder : copy.referencePlaceholder} required={isPaymentReferenceRequired} {...fieldErrorProps('ledger-reference_code', mpesaCodeError || fieldError('reference_code'))} /><FieldError id="ledger-reference_code" message={mpesaCodeError || fieldError('reference_code')} /></label>
            <label className="form-control"><span className="label-text">{copy.incomeNotes}</span><textarea id="ledger-description" {...fieldErrorProps('ledger-description', fieldError('description'))} name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder={copy.incomeNotesPlaceholder} /><FieldError id="ledger-description" message={fieldError('description')} /></label>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateField label={copy.expenseDate} name="date" value={formData.date} max={todayLocalIso()} onChange={setDate} required className="form-control" error={fieldError('date')} />
              <label className="form-control"><span className="label-text">{copy.amountPaid}</span><input type="number" min="0.01" step="0.01" id="ledger-amount" {...fieldErrorProps('ledger-amount', fieldError('amount'))} name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder={copy.amountPaidPlaceholder} required /><FieldError id="ledger-amount" message={fieldError('amount')} /></label>
            </div>
            <label className="form-control"><span className="label-text">{copy.payee}</span><input type="text" id="ledger-party" {...fieldErrorProps('ledger-party', fieldError('party'))} name="party" value={formData.party} onChange={handleChange} className="input-machined" placeholder={copy.payeePlaceholder} required /><FieldError id="ledger-party" message={fieldError('party')} /></label>
            <label className="form-control"><span className="label-text">{copy.expenseCategory}</span><select id="ledger-category" {...fieldErrorProps('ledger-category', fieldError('category'))} name="category" value={formData.category} onChange={handleChange} className="input-machined" required>{categories.expense.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError id="ledger-category" message={fieldError('category')} /></label>
            <label className="form-control"><span className="label-text">{requiresCommodityQuantity ? copy.itemName : copy.serviceDescription}</span><input type="text" id="ledger-item_name" {...fieldErrorProps('ledger-item_name', fieldError('item_name'))} name="item_name" value={formData.item_name} onChange={handleChange} className="input-machined" placeholder={requiresCommodityQuantity ? copy.itemPlaceholder : copy.servicePlaceholder} required /><FieldError id="ledger-item_name" message={fieldError('item_name')} /></label>
            {requiresCommodityQuantity && (
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control"><span className="label-text">{copy.quantity}</span><input type="number" min="0.001" step="0.001" id="ledger-quantity" {...fieldErrorProps('ledger-quantity', fieldError('quantity'))} name="quantity" value={formData.quantity} onChange={handleChange} className="input-machined" placeholder={copy.quantityPlaceholder} required /><FieldError id="ledger-quantity" message={fieldError('quantity')} /></label>
                <label className="form-control"><span className="label-text">{copy.unit}</span><select name="quantity_unit" value={formData.quantity_unit} onChange={handleChange} className="input-machined" required>{Object.entries(copy.units).map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}</select></label>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              <div className="form-control">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="label-text">{copy.costClass}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex text-ink-muted transition-colors hover:text-brand" aria-label={copy.explainCostClasses}>
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
                <select id="ledger-cost_class" {...fieldErrorProps('ledger-cost_class', fieldError('cost_class'))} name="cost_class" value={categories.resolveCostClass(formData.category, formData.cost_class)} onChange={handleChange} className="input-machined" required>
                  {categories.costClasses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError id="ledger-cost_class" message={fieldError('cost_class')} />
              </div>
            </div>
            <label className="form-control">
              <span className="label-text">{copy.paymentMethod}</span>
              <select id="ledger-paymentMethod" {...fieldErrorProps('ledger-paymentMethod', fieldError('paymentMethod'))} name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                <option value="M-Pesa">{methods['M-Pesa']}</option><option value="Cash">{methods.Cash}</option><option value="Bank">{methods.Bank}</option><option value="Other">{methods.Other}</option>
              </select>
              <FieldError id="ledger-paymentMethod" message={fieldError('paymentMethod')} />
            </label>
            <label className="form-control"><span className="label-text">{copy.receiptNumber}</span><input type="text" id="ledger-reference_code" {...fieldErrorProps('ledger-reference_code', fieldError('reference_code'))} name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined" placeholder={copy.receiptPlaceholder} /><FieldError id="ledger-reference_code" message={fieldError('reference_code')} /></label>
            <label className="form-control"><span className="label-text">{copy.details}</span><textarea id="ledger-description" {...fieldErrorProps('ledger-description', fieldError('description'))} name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder={copy.detailsPlaceholder} /><FieldError id="ledger-description" message={fieldError('description')} /></label>
            <div className="grid grid-cols-1 gap-4 border-t border-ink/10 pt-4">
              <div className="form-control">
                <span className="label-text">{copy.animals}</span>
                <button
                  type="button"
                  onClick={() => setIsAnimalListOpen((current) => !current)}
                  aria-expanded={isAnimalListOpen}
                  aria-controls="animals-for-expense-list"
                  className="mt-1 flex w-full items-center justify-between rounded-lg border border-ink/15 bg-card px-3 py-2.5 text-left text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/20 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  <span>{copy.selectAnimals(formData.animal_ids.length)}</span>
                  {isAnimalListOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                </button>
                {isAnimalListOpen && (
                  <div id="animals-for-expense-list" className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-ink/15 bg-card">
                    {animals.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-ink-muted">{copy.noAnimals}</p>
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
                  <span className="label-text">{copy.animalCostType}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="inline-flex text-ink-muted transition-colors hover:text-brand" aria-label={copy.explainCostClasses}>
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
                <select id="ledger-animal_cost_type" {...fieldErrorProps('ledger-animal_cost_type', fieldError('animal_cost_type'))} name="animal_cost_type" value={formData.animal_cost_type} onChange={handleChange} className="input-machined" disabled={!hasSelectedAnimals}>
                  <option value="">{copy.selectCostType}</option>
                  {Object.entries(copy.animalCostTypes).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
                <FieldError id="ledger-animal_cost_type" message={fieldError('animal_cost_type')} />
              </div>
            </div>
            {!hasSelectedAnimals && <p className="text-xs text-ink-muted">{copy.animalsHint}</p>}
            {hasSelectedAnimals && isAnimalAllocationIncomplete && <p className="text-xs text-brand-dark">{copy.costTypeNeeded}</p>}
          </>
        )}
      </div>
    </BaseModal>
  );
}
