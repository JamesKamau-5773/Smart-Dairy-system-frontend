import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Wallet, TrendingUp, TrendingDown, ChevronsRight, Plus, X, Search, Filter, RotateCcw, ChevronDown, ChevronUp, PencilLine } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole } from '../../lib/roles';
import { financeApi, getApiErrorMessage, herdApi } from '../../lib/backendApi';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import Money from '../../components/ui/Money';
import ReceiptPreview from '../../components/finance/ReceiptPreview';
import { buildLedgerEntryPayload } from '../../lib/ledgerEntryPayload';
import { downloadReceiptPdf, shareReceiptText } from '../../lib/receipt';
import toast from 'react-hot-toast';
import GroupedDateRows from '../../components/ui/GroupedDateRows';

const SummaryCard = ({ title, value, icon: Icon, tone = 'default' }) => {
  const tones = {
    default: 'text-ink',
    success: 'text-success',
    danger: 'text-danger',
  };
  return (
    <div className="card-machined p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-surface-raised border border-ink/10 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</p>
          <p className="text-2xl font-bold text-brand-700">{value}</p>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || '').toLowerCase();
  let styles = 'bg-amber-50 text-amber-700'; // Default to Pending
  if (normalizedStatus === 'posted' || normalizedStatus === 'cleared' || normalizedStatus === 'paid' || normalizedStatus === 'revenue') {
    styles = 'bg-emerald-50 text-emerald-800';
  } else if (normalizedStatus === 'pending') {
    styles = 'bg-amber-50 text-amber-700';
  } else if (normalizedStatus === 'voided' || normalizedStatus === 'void' || normalizedStatus === 'cancelled') {
    styles = 'bg-slate-100 text-slate-600';
  } else if (normalizedStatus === 'expense') {
    styles = 'bg-rose-50 text-rose-700';
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium ${styles}`}>
      {status || 'Pending'}
    </span>
  );
};

const EXPENSE_CATEGORIES = [
  ['Feed Purchase', 'Feed and supplies'],
  ['Labor / Wages', 'Labor and wages'],
  ['Utilities', 'Utilities'],
  ['Vet Fees', 'Veterinary services'],
  ['Equipment Maintenance', 'Equipment maintenance'],
  ['Transport', 'Transport'],
  ['Other', 'Other expense'],
];

const COST_CLASSES = [
  ['COGS', 'Production cost'],
  ['CUSTOMER_ACQUISITION', 'Customer acquisition'],
  ['OPERATING', 'Operating cost'],
  ['CAPITAL', 'Capital expenditure'],
];

const isCorrectableExpense = (transaction) => (
  String(transaction?.transaction_type || transaction?.type || '').toLowerCase() === 'expense'
  && String(transaction?.status || '').toUpperCase() === 'POSTED'
);

const LedgerCorrectionModal = ({ transaction, onClose, onSubmit, isPending }) => {
  const [category, setCategory] = useState(transaction.category || 'Other');
  const [costClass, setCostClass] = useState(transaction.cost_class || 'OPERATING');
  const [reason, setReason] = useState('');
  const isValid = category && costClass && reason.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    onSubmit({
      void_reason: reason.trim(),
      replacement: { category, cost_class: costClass },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="text-lg font-bold text-ink">Correct expense classification</h3>
            <p className="mt-1 text-sm text-ink-muted">The original entry will be voided and replaced with a linked corrected entry.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-full p-1 text-ink-muted hover:bg-gray-100" aria-label="Close correction form"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface-raised p-3 text-sm">
            <dt className="text-ink-muted">Expense</dt><dd className="text-right font-semibold text-ink">{transaction.item_name || transaction.description || transaction.category}</dd>
            <dt className="text-ink-muted">Amount</dt><dd className="text-right font-semibold text-ink"><Money amount={transaction.amount} /></dd>
          </dl>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="form-control"><span className="label-text">Corrected category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="input-machined" required>{EXPENSE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="form-control"><span className="label-text">Corrected cost class</span><select value={costClass} onChange={(event) => setCostClass(event.target.value)} className="input-machined" required>{COST_CLASSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="form-control"><span className="label-text">Reason for correction</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="input-machined" rows="3" placeholder="Explain why this classification is being corrected" required /></label>
        </div>
        <div className="flex justify-end gap-3 border-t bg-gray-50 p-4">
          <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isPending || !isValid} className="btn-primary">{isPending ? 'Correcting...' : 'Void and replace'}</button>
        </div>
      </form>
    </div>
  );
};

const LedgerEntryFormModal = ({ onClose, transactionType, farmId, tenantId }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: transactionType === 'income' ? 'Milk Sale' : 'Feed Purchase',
    incomePayerType: 'customer',
    customer_id: '',
    income_source: '',
    party: '',
    item_name: '',
    quantity: '',
    cost_class: 'COGS',
    paymentMethod: 'M-Pesa',
    animal_id: '',
    animal_cost_type: '',
    reference_code: '',
    description: '',
  }));

  const { data: customers = [] } = useQuery({
    queryKey: [QUERY_KEYS.CUSTOMERS, tenantId, farmId],
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
          reference_code: newEntry.reference_code,
          note: newEntry.description,
          date: newEntry.date,
          payment_method: newEntry.payment_method,
        });
      }
      return financeApi.createLedgerEntry(newEntry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEDGER_ENTRIES, tenantId, farmId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOMERS, tenantId, farmId] });
      toast.success(transactionType === 'income' && formData.incomePayerType === 'customer' ? 'Customer payment recorded.' : 'Transaction logged successfully!');
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to log transaction: ${getApiErrorMessage(error)}`);
      console.error(error);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(buildLedgerEntryPayload(formData, transactionType));
  };

  const isIncomeCounterpartyMissing = formData.incomePayerType === 'customer'
    ? !formData.customer_id
    : !formData.income_source.trim();
  const isCustomerPayment = transactionType === 'income' && formData.incomePayerType === 'customer';
  const isIncomeFormInvalid = !formData.date || !formData.amount || !formData.category || isIncomeCounterpartyMissing || (isCustomerPayment && !formData.reference_code.trim());
  const isAnimalAllocationIncomplete = Boolean(formData.animal_id) !== Boolean(formData.animal_cost_type);
  const isExpenseFormInvalid = !formData.date || !formData.amount || !formData.category || !formData.party.trim() || !formData.item_name.trim() || !formData.quantity || isAnimalAllocationIncomplete;
  const isFormInvalid = transactionType === 'income' ? isIncomeFormInvalid : isExpenseFormInvalid;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-reveal-fast">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-ink">
            {transactionType === 'income' ? 'Record Income or Customer Payment' : 'Log New Expense'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-ink-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {transactionType === 'income' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control"><span className="label-text">Date received</span><input type="date" name="date" value={formData.date} onChange={handleChange} className="input-machined" required /></label>
                  <label className="form-control"><span className="label-text">Income amount (KSh)</span><input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder="e.g., 5000" required /></label>
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
                      <option value="Milk Sale">Milk sales</option>
                      <option value="Livestock Sale">Livestock sales</option>
                      <option value="Other Income">Other income</option>
                    </select>
                  </label>
                  <label className="form-control">
                    <span className="label-text">Payment received via</span>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                      <option value="M-Pesa">M-Pesa</option><option value="Cash">Cash</option><option value="Bank">Bank transfer</option><option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <label className="form-control"><span className="label-text">Payment reference{isCustomerPayment ? ' (required)' : ''}</span><input type="text" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined" placeholder="M-Pesa, cash receipt, or bank transaction code" required={isCustomerPayment} /></label>
                <label className="form-control"><span className="label-text">Income notes</span><textarea name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder="What was this payment for?" /></label>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control"><span className="label-text">Expense date</span><input type="date" name="date" value={formData.date} onChange={handleChange} className="input-machined" required /></label>
                  <label className="form-control"><span className="label-text">Amount paid (KSh)</span><input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder="e.g., 2500" required /></label>
                </div>
                <label className="form-control"><span className="label-text">Supplier or payee</span><input type="text" name="party" value={formData.party} onChange={handleChange} className="input-machined" placeholder="e.g., Agrovet Store or employee name" required /></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control"><span className="label-text">Item / commodity name</span><input type="text" name="item_name" value={formData.item_name} onChange={handleChange} className="input-machined" placeholder="e.g., Maize Meal, Dairy Meal, Vet Drugs" required /></label>
                  <label className="form-control"><span className="label-text">Quantity</span><input type="number" min="0.001" step="0.001" name="quantity" value={formData.quantity} onChange={handleChange} className="input-machined" placeholder="e.g., 50" required /></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control">
                    <span className="label-text">Expense category</span>
                    <select name="category" value={formData.category} onChange={handleChange} className="input-machined" required>
                      <option value="Feed Purchase">Feed and supplies</option>
                      <option value="Labor / Wages">Labor and wages</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Vet Fees">Veterinary services</option>
                      <option value="Equipment Maintenance">Equipment maintenance</option>
                      <option value="Transport">Transport</option>
                      <option value="Other">Other expense</option>
                    </select>
                  </label>
                  <label className="form-control">
                    <span className="label-text">Cost classification</span>
                    <select name="cost_class" value={formData.cost_class} onChange={handleChange} className="input-machined" required>
                      <option value="COGS">Production cost</option>
                      <option value="CUSTOMER_ACQUISITION">Customer acquisition</option>
                      <option value="OPERATING">Operating cost</option>
                      <option value="CAPITAL">Capital expenditure</option>
                    </select>
                  </label>
                </div>
                <label className="form-control">
                  <span className="label-text">Payment method used</span>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                    <option value="M-Pesa">M-Pesa</option><option value="Cash">Cash</option><option value="Bank">Bank transfer</option><option value="Other">Other</option>
                  </select>
                </label>
                <label className="form-control"><span className="label-text">Receipt or invoice number</span><input type="text" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined" placeholder="Supplier receipt, invoice, or transaction code" /></label>
                <label className="form-control"><span className="label-text">Purchase or expense details</span><textarea name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2" placeholder="Describe the goods or services purchased" /></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-ink/10 pt-4">
                  <label className="form-control">
                    <span className="label-text">Animal (optional direct cost)</span>
                    <select name="animal_id" value={formData.animal_id} onChange={handleChange} className="input-machined">
                      <option value="">Farm-wide expense</option>
                      {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number || animal.tag || animal.id}{animal.name ? ` - ${animal.name}` : ''}</option>)}
                    </select>
                  </label>
                  <label className="form-control">
                    <span className="label-text">Animal cost type</span>
                    <select name="animal_cost_type" value={formData.animal_cost_type} onChange={handleChange} className="input-machined" disabled={!formData.animal_id}>
                      <option value="">Select cost type</option>
                      <option value="PURCHASE">Purchase</option><option value="CALF_FEED">Calf feed</option><option value="HEIFER_FEED">Heifer feed</option><option value="BREEDING">Breeding</option><option value="VETERINARY">Veterinary</option><option value="LABOR">Labor</option><option value="HOUSING">Housing</option><option value="OVERHEAD">Overhead</option><option value="OTHER">Other</option>
                    </select>
                  </label>
                </div>
                {isAnimalAllocationIncomplete && <p className="text-xs text-danger">Select a cost type to assign this expense to the animal.</p>}
              </>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending || isFormInvalid}>
              {mutation.isPending ? 'Saving...' : `Log ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FinancialLedger = () => {
  const { tenantId, farmId } = useTenant();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [filters] = useState({ page: 1, per_page: 20 });
  const [ledgerFilters, setLedgerFilters] = useState({ search: '', type: 'all', category: 'all', from: '', to: '' });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTransactionType, setModalTransactionType] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [isReceiptDownloading, setIsReceiptDownloading] = useState(false);
  const [transactionToCorrect, setTransactionToCorrect] = useState(null);
  const canCorrectExpenses = hasRole(currentUser, ['FARMER']);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEYS.LEDGER_ENTRIES, tenantId, farmId, filters],
    // The backend endpoint for the general ledger requires a scope. While this should
    // be handled by the tenant/farm ID in the headers, the ledger endpoint specifically
    // seems to require them as query parameters to return the farm-wide view instead
    // of demanding a `customer_id`.
    queryFn: () => financeApi.listLedgerEntries({ ...filters, farm_id: farmId, tenant_id: tenantId }),
    enabled: !!tenantId && !!farmId,
    keepPreviousData: true,
  });

  const transactions = useMemo(() => data?.items || [], [data]);
  const filteredTransactions = useMemo(() => {
    const search = ledgerFilters.search.trim().toLowerCase();

    return transactions.filter((tx) => {
      const searchable = [
        tx.counterparty_name,
        tx.customer_name,
        tx.buyer_name,
        tx.category,
        tx.item_name,
        tx.description,
        tx.reference_code,
        tx.status,
        tx.transaction_type,
      ].filter(Boolean).join(' ').toLowerCase();
      const transactionType = String(tx.transaction_type || tx.type || '').toLowerCase();
      const matchesSearch = !search || searchable.includes(search);
      const matchesType = ledgerFilters.type === 'all' || transactionType === ledgerFilters.type.toLowerCase();
      const matchesCategory = ledgerFilters.category === 'all' || String(tx.category || '').toLowerCase() === ledgerFilters.category.toLowerCase();
      const matchesFrom = !ledgerFilters.from || String(tx.date || '').slice(0, 10) >= ledgerFilters.from;
      const matchesTo = !ledgerFilters.to || String(tx.date || '').slice(0, 10) <= ledgerFilters.to;

      return matchesSearch && matchesType && matchesCategory && matchesFrom && matchesTo;
    });
  }, [transactions, ledgerFilters]);
  const ledgerCategories = useMemo(() => [...new Set(transactions.map((tx) => tx.category).filter(Boolean))].sort(), [transactions]);
  const summary = useMemo(() => data?.summary || {}, [data]);
  const correctionMutation = useMutation({
    mutationFn: ({ transactionId, payload }) => financeApi.voidAndReplaceExpense(transactionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEDGER_ENTRIES, tenantId, farmId] });
      setTransactionToCorrect(null);
      toast.success('Expense corrected. The original entry is now voided.');
    },
    onError: (correctionError) => toast.error(`Could not correct expense: ${getApiErrorMessage(correctionError)}`),
  });

  const handleOpenModal = (type) => {
    setModalTransactionType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTransactionType(null);
  };

  const clearLedgerFilters = () => setLedgerFilters({ search: '', type: 'all', category: 'all', from: '', to: '' });
  const openReceipt = async (transaction) => {
    if (!transaction.receipt_available || !transaction.receipt?.id) return;
    setIsReceiptLoading(true);
    try {
      setSelectedReceipt(await financeApi.getReceipt(transaction.receipt.id));
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    } finally {
      setIsReceiptLoading(false);
    }
  };
  const closeReceipt = () => setSelectedReceipt(null);
  const handleDownloadReceipt = async () => {
    setIsReceiptDownloading(true);
    try {
      downloadReceiptPdf(selectedReceipt, await financeApi.downloadReceiptPdf(selectedReceipt.id));
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    } finally {
      setIsReceiptDownloading(false);
    }
  };
  const handleShareReceipt = async () => {
    try {
      await shareReceiptText(selectedReceipt);
      toast.success(navigator.share ? 'Receipt shared.' : 'Receipt copied.');
    } catch (receiptError) {
      if (receiptError?.name !== 'AbortError') toast.error('Could not share receipt.');
    }
  };

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 rounded-card border border-brand-100 bg-brand-50 p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white text-brand-700 rounded-lg border border-brand-100"><Wallet size={20} /></div>
          <div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand-900 m-0">Financial Ledger</h2>
            <p className="text-sm text-brand-700/80 mt-1">All income and expense transactions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal('income')} className="flex items-center gap-2 rounded-button bg-brand-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-900"><Plus size={16} /><span>Log Income</span></button>
          <button onClick={() => handleOpenModal('expense')} className="flex items-center gap-2 rounded-button bg-brand-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-900"><Plus size={16} /><span>Log Expense</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Income" value={<Money amount={summary.total_income ?? 0} />} icon={TrendingUp} tone="success" />
        <SummaryCard title="Total Costs" value={<Money amount={summary.total_costs ?? 0} />} icon={TrendingDown} tone="danger" />
        <SummaryCard title="Net Profit" value={<Money amount={summary.total_profit ?? 0} />} icon={ChevronsRight} />
        <SummaryCard title="Profit Per Liter" value={<Money amount={summary.profit_per_liter ?? summary.profitPerLiter ?? 0} />} icon={ChevronsRight} />
      </div>

      <div className="card-machined p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setIsFiltersOpen((current) => !current)} className="inline-flex items-center gap-2 text-sm font-bold text-brand" aria-expanded={isFiltersOpen}>
            <Filter size={15} /> Search and filter transactions
            {isFiltersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {isFiltersOpen && (
            <button type="button" onClick={clearLedgerFilters} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand">
              <RotateCcw size={14} /> Reset filters
            </button>
          )}
        </div>
        {isFiltersOpen && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search transactions</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input type="search" value={ledgerFilters.search} onChange={(event) => setLedgerFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search customer, item, category, description, reference..." className="input-machined pl-9" />
          </label>
          <label>
            <span className="sr-only">Transaction type</span>
            <select value={ledgerFilters.type} onChange={(event) => setLedgerFilters((current) => ({ ...current, type: event.target.value }))} className="input-machined">
              <option value="all">All types</option>
              <option value="revenue">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select value={ledgerFilters.category} onChange={(event) => setLedgerFilters((current) => ({ ...current, category: event.target.value }))} className="input-machined">
              <option value="all">All categories</option>
              {ledgerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-1">
            <label><span className="sr-only">From date</span><input type="date" value={ledgerFilters.from} onChange={(event) => setLedgerFilters((current) => ({ ...current, from: event.target.value }))} className="input-machined" aria-label="From date" /></label>
            <label><span className="sr-only">To date</span><input type="date" value={ledgerFilters.to} onChange={(event) => setLedgerFilters((current) => ({ ...current, to: event.target.value }))} className="input-machined" aria-label="To date" /></label>
          </div>
        </div>
        )}
        <div className="flex items-center gap-2 text-xs text-ink-muted"><Search size={14} /> Showing {filteredTransactions.length} of {transactions.length} loaded transactions</div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-800">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Customer/Supplier</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Category</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Description</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Ref Code</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white text-right">Amount</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white text-right">Receipt</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-white">
              {isLoading ? (
                <tr><td colSpan="9" className="p-10 text-center text-ink-muted">Loading transactions...</td></tr>
              ) : isError ? (
                <tr><td colSpan="9" className="p-10 text-center text-danger">Error: {getApiErrorMessage(error)}</td></tr>
              ) : filteredTransactions.length > 0 ? (
                <GroupedDateRows
                  items={filteredTransactions}
                  getDate={(tx) => tx.date}
                  colSpan={9}
                  dateRowClassName="bg-brand-50 text-brand-900 text-xs font-bold"
                  renderGroupMeta={(items) => `${items.length} ${items.length === 1 ? 'transaction' : 'transactions'}`}
                  renderItem={(tx) => (
                <tr key={tx.id} className="hover:bg-surface-raised transition-colors">
                  <td className="p-4 text-sm text-ink-muted font-medium font-mono">{format(parseISO(tx.date), 'PPP')}</td>
                  <td className="p-4 text-sm text-ink font-semibold">{tx.counterparty_name || tx.customer_name || tx.buyer_name || 'N/A'}</td>
                  <td className="p-4 text-sm text-ink-muted">{tx.category}</td>
                  <td className="p-4 text-sm text-ink-muted">
                    {tx.item_name && <div className="font-semibold text-ink">{tx.item_name}</div>}
                    <div>{tx.description || (tx.item_name ? 'No additional details' : 'N/A')}</div>
                  </td>
                  <td className="p-4 text-sm text-ink-muted font-mono">{tx.reference_code || 'N/A'}</td>
                  <td className={`p-4 text-sm font-semibold text-right tabular-nums font-mono ${tx.amount < 0 ? 'text-danger' : 'text-slate-800'}`}><Money amount={tx.amount} /></td>
                  <td className="p-4 text-sm"><StatusBadge status={tx.status || tx.transaction_type} /></td>
                  <td className="p-4 text-right">
                    {tx.receipt_available && tx.receipt?.id ? (
                      <button type="button" disabled={isReceiptLoading} onClick={() => openReceipt(tx)} className="text-xs font-bold text-brand hover:text-brand-dark underline-offset-2 hover:underline disabled:opacity-50">
                        View receipt
                      </button>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {canCorrectExpenses && isCorrectableExpense(tx) ? (
                      <button type="button" onClick={() => setTransactionToCorrect(tx)} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark" title="Void this expense and create a corrected replacement">
                        <PencilLine size={14} /> Correct cost
                      </button>
                    ) : <span className="text-xs text-ink-muted">—</span>}
                  </td>
                </tr>
                  )}
                />
              ) : null}
              {!isLoading && !isError && filteredTransactions.length === 0 && (
                <tr><td colSpan="9" className="p-10 text-center text-ink-muted">{transactions.length === 0 ? 'No transactions recorded yet.' : 'No transactions match the selected filters.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <LedgerEntryFormModal
          key={modalTransactionType}
          onClose={handleCloseModal}
          transactionType={modalTransactionType}
          farmId={farmId}
          tenantId={tenantId}
        />
      )}

      {transactionToCorrect && (
        <LedgerCorrectionModal
          transaction={transactionToCorrect}
          onClose={() => setTransactionToCorrect(null)}
          onSubmit={(payload) => correctionMutation.mutate({ transactionId: transactionToCorrect.id, payload })}
          isPending={correctionMutation.isPending}
        />
      )}

      {selectedReceipt && (
        <ReceiptPreview
          receipt={selectedReceipt}
          isOpen={Boolean(selectedReceipt)}
          onClose={closeReceipt}
          onDownload={handleDownloadReceipt}
          onShare={handleShareReceipt}
          isDownloading={isReceiptDownloading}
        />
      )}
    </div>
  );
};

export default FinancialLedger;
