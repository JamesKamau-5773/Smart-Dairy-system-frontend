import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Wallet, TrendingUp, TrendingDown, ChevronsRight, Plus, X } from 'lucide-react';

import { useTenant } from '../../hooks/useTenant';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import Money from '../../components/ui/Money';
import toast from 'react-hot-toast';

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
          <p className="text-2xl font-black">{value}</p>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || '').toLowerCase();
  let styles = 'bg-yellow-100 text-yellow-800'; // Default to Pending
  if (normalizedStatus === 'cleared' || normalizedStatus === 'paid' || normalizedStatus === 'revenue') {
    styles = 'bg-success/10 text-success';
  } else if (normalizedStatus === 'pending') {
    styles = 'bg-warning/10 text-warning-dark';
  } else if (normalizedStatus === 'void' || normalizedStatus === 'cancelled' || normalizedStatus === 'expense') {
    styles = 'bg-danger/10 text-danger';
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {status || 'Pending'}
    </span>
  );
};

const LedgerEntryFormModal = ({ isOpen, onClose, transactionType, farmId, tenantId }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  const { data: customers = [] } = useQuery({
    queryKey: [QUERY_KEYS.CUSTOMERS, tenantId, farmId],
    queryFn: () => financeApi.listCustomers(),
    enabled: !!tenantId && !!farmId && isOpen && transactionType === 'income',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: transactionType === 'income' ? 'Milk Sales' : 'Feed',
        customer_id: '',
        party: '', // For expense supplier
        paymentMethod: 'M-Pesa',
        reference_code: '',
        description: '',
      });
    }
  }, [isOpen, transactionType]);

  const mutation = useMutation({
    mutationFn: (newEntry) => financeApi.createLedgerEntry(newEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEDGER_ENTRIES, tenantId, farmId] });
      toast.success('Transaction logged successfully!');
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
    const payload = {
      date: formData.date,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      reference_code: formData.reference_code,
      description: formData.description,
      type: transactionType, // 'income' or 'expense'
      farm_id: farmId,
      tenant_id: tenantId,
      stream: formData.category,
    };

    if (transactionType === 'income') {
      payload.customer_id = formData.customer_id;
    } else {
      payload.party = formData.party;
    }

    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  const isIncomeFormInvalid = !formData.amount || !formData.category || !formData.customer_id;
  const isExpenseFormInvalid = !formData.amount || !formData.category;
  const isFormInvalid = transactionType === 'income' ? isIncomeFormInvalid : isExpenseFormInvalid;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-reveal-fast">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-ink">
            Log New {transactionType === 'income' ? 'Income' : 'Expense'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-ink-muted">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control"><span className="label-text">Date Received</span><input type="date" name="date" value={formData.date} onChange={handleChange} className="input-machined" required /></label>
              <label className="form-control"><span className="label-text">Amount Received (KSH)</span><input type="number" step="any" name="amount" value={formData.amount} onChange={handleChange} className="input-machined" placeholder="e.g., 5000" required /></label>
            </div>
            {transactionType === 'income' ? (
              <label className="form-control">
                <span className="label-text">Who paid you? (Customer/Co-op)</span>
                <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="input-machined" required>
                  <option value="" disabled>Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="form-control"><span className="label-text">Party (Supplier)</span><input type="text" name="party" value={formData.party} onChange={handleChange} className="input-machined" placeholder="e.g., Agrovet Store" /></label>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text">What is this for?</span>
                <select name="category" value={formData.category} onChange={handleChange} className="input-machined" required>
                  {transactionType === 'income' ? <option value="Milk Sales">Milk Sales</option> : <><option value="Feed">Feed</option><option value="Labor">Labor</option><option value="Utilities">Utilities</option><option value="Vet Services">Vet Services</option><option value="Other">Other</option></>}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text">Payment Method</span>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-machined" required>
                  <option value="M-Pesa">M-Pesa</option><option value="Cash">Cash</option><option value="Bank">Bank</option><option value="Other">Other</option>
                </select>
              </label>
            </div>
            <label className="form-control"><span className="label-text">Transaction Reference (Code)</span><input type="text" name="reference_code" value={formData.reference_code} onChange={handleChange} className="input-machined" placeholder="e.g., UHA213HOIG" /></label>
            <label className="form-control"><span className="label-text">Additional Details</span><textarea name="description" value={formData.description} onChange={handleChange} className="input-machined" rows="2"></textarea></label>
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
  const [filters, setFilters] = useState({ page: 1, per_page: 20 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTransactionType, setModalTransactionType] = useState(null);

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
  const summary = useMemo(() => data?.summary || {}, [data]);
  const meta = useMemo(() => data?.meta || {}, [data]);

  const handleOpenModal = (type) => {
    setModalTransactionType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTransactionType(null);
  };

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand/5 text-brand rounded-lg border border-brand/10"><Wallet size={20} /></div>
          <div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0">Financial Ledger</h2>
            <p className="text-sm text-ink-muted mt-1">All income and expense transactions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal('income')} className="btn-primary flex items-center gap-2"><Plus size={16} /><span>Log Income</span></button>
          <button onClick={() => handleOpenModal('expense')} className="btn-secondary flex items-center gap-2"><Plus size={16} /><span>Log Expense</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Income" value={<Money amount={summary.total_income ?? 0} />} icon={TrendingUp} tone="success" />
        <SummaryCard title="Total Costs" value={<Money amount={summary.total_costs ?? 0} />} icon={TrendingDown} tone="danger" />
        <SummaryCard title="Net Profit" value={<Money amount={summary.total_profit ?? 0} />} icon={ChevronsRight} />
        <SummaryCard title="Profit Per Liter" value={<Money amount={summary.profit_per_liter ?? summary.profitPerLiter ?? 0} />} icon={ChevronsRight} />
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand/5">
              <tr className="border-b border-ink/10">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Customer/Supplier</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Category</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Description</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Ref Code</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted text-right">Amount</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-white">
              {isLoading ? (
                <tr><td colSpan="7" className="p-10 text-center text-ink-muted">Loading transactions...</td></tr>
              ) : isError ? (
                <tr><td colSpan="7" className="p-10 text-center text-danger">Error: {getApiErrorMessage(error)}</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-raised transition-colors">
                  <td className="p-4 text-sm text-ink-muted font-medium">{format(parseISO(tx.date), 'PPP')}</td>
                  <td className="p-4 text-sm text-ink font-semibold">{tx.counterparty_name || tx.customer_name || tx.buyer_name || 'N/A'}</td>
                  <td className="p-4 text-sm text-ink-muted">{tx.category}</td>
                  <td className="p-4 text-sm text-ink-muted">{tx.description || 'N/A'}</td>
                  <td className="p-4 text-sm text-ink-muted font-mono">{tx.reference_code || 'N/A'}</td>
                  <td className={`p-4 text-sm font-semibold text-right tabular-nums ${tx.transaction_type === 'Revenue' ? 'text-success' : 'text-danger'}`}><Money amount={tx.amount} /></td>
                  <td className="p-4 text-sm"><StatusBadge status={tx.status || tx.transaction_type} /></td>
                </tr>
              ))}
              {!isLoading && !isError && transactions.length === 0 && (
                <tr><td colSpan="7" className="p-10 text-center text-ink-muted">No transactions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LedgerEntryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transactionType={modalTransactionType}
        farmId={farmId}
        tenantId={tenantId}
      />
    </div>
  );
};

export default FinancialLedger;