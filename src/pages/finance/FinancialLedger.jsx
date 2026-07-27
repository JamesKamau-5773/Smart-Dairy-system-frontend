import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, } from '@tanstack/react-query';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import apiClient from '../../lib/apiClient';
import { financeApi } from '../../lib/backendApi';
import { Wallet, ArrowUpRight, ArrowDownLeft, Receipt, ShieldCheck, Sun, Moon } from 'lucide-react';
import ExpenseModal from '../../components/forms/ExpenseModal';
import IncomeModal from '../../components/forms/IncomeModal';
import { calculateKpis } from '../../lib/financeUtils';
import FinancialKpiCards from '../../components/finance/FinancialKpiCards';
import { useTheme } from '../../providers/ThemeProvider';

const TransactionRow = ({ tx }) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="px-6 py-4 text-xs font-bold text-slate-500">{tx.date}</td>
    <td className="px-6 py-4 font-mono bg-slate-50 border border-slate-100 rounded text-[11px] font-black text-ink">
      {tx.reference || 'N/A'}
    </td>
    <td className="px-6 py-4">
      <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600">{tx.category}</span>
    </td>
    <td className="px-6 py-4 text-xs font-bold text-ink">{tx.party}</td>
    <td className="px-6 py-4">
      <span className={`text-[9px] font-bold px-2 py-1 rounded ${
        tx.status === 'CLEARED' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-100'
      }`}>
        {tx.status}
      </span>
    </td>
    <td className={`px-6 py-4 text-right font-black ${tx.type === 'income' ? 'text-brand' : 'text-danger'}`}>
      {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </td>
  </tr>
);

export default function FinancialLedger() {
  const { tenantId, farmId, tenant } = useTenant();
  const queryClient = useQueryClient();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isCoopMember = tenant?.isCoopMember || false;

  const { data: finance } = useQuery({
    queryKey: QUERY_KEYS.UNIT_COST(tenantId, farmId),
    queryFn: () => financeApi.unitCost(),
    enabled: !!farmId,
  });

  // Fetch customer data at the page level to pass down to modals.
  // This follows the best practice of lifting state up and passing clean data down.
  const { data: customersData } = useQuery({
    queryKey: ['customers', tenantId, farmId],
    queryFn: () => financeApi.listCustomers(),
    enabled: !!farmId,
  });

  // Extract the array cleanly, providing a safe fallback.
  // The modal will now always receive a predictable array.
  const customers = customersData?.items || [];

  const { data: ledgerData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['ledger-entries', tenantId, farmId],
    queryFn: () => financeApi.listLedgerEntries(),
    enabled: !!farmId,
  });

  // Derive transactions directly from the query result. This avoids an anti-pattern
  // of syncing server state into local state and prevents an extra re-render.
  const transactions = ledgerData?.items || [];
  const useTransactionMutation = (transactionType) => {
    return useMutation({
      mutationFn: async (newTransactionData) => {
        return financeApi.createLedgerEntry({
          ...newTransactionData,
          tenant_id: tenantId,
          farm_id: farmId,
          type: transactionType,
          status: transactionType === 'income' ? 'CLEARED' : 'PAID',
          party: transactionType === 'income' ? newTransactionData.source : newTransactionData.paidTo,
          amount: transactionType === 'income'
            ? parseFloat(newTransactionData.amount)
            : -Math.abs(parseFloat(newTransactionData.amount)),
        });
      },
      onSuccess: () => {
        // Invalidate and refetch the ledger entries to show the new transaction
        queryClient.invalidateQueries({ queryKey: ['ledger-entries', tenantId, farmId] });
        // Close the relevant modal on success
        if (transactionType === 'income') {
          setIsIncomeModalOpen(false);
        } else {
          setIsExpenseModalOpen(false);
        }
      },
      onError: (error) => {
        console.error(`Failed to add ${transactionType}:`, error);
      },
    });
  };

  const addIncomeMutation = useTransactionMutation('income');
  const addExpenseMutation = useTransactionMutation('expense');

  const kpis = useMemo(() => calculateKpis(transactions), [transactions]);

  const totalProfit = kpis.totalIncome - kpis.totalCosts;

  return (
    <div className="animate-reveal p-8">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand/5 text-brand text-[10px] font-black uppercase tracking-widest mb-3 rounded-md border border-brand/10">
            <Wallet size={12} /> Financial Registry
          </div>
          <h2 className="font-sans font-black text-3xl tracking-tight text-ink m-0">Capital Ledger</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="flex items-center p-2.5 bg-white border border-slate-200 text-ink rounded-lg hover:bg-slate-50 transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center px-5 py-2.5 bg-white border border-slate-200 text-ink rounded-lg font-black text-xs uppercase hover:bg-slate-50 transition-all">
            <ArrowDownLeft size={14} className="mr-2 text-danger" /> Log Expense
          </button>
          <button onClick={() => setIsIncomeModalOpen(true)} className="flex items-center px-5 py-2.5 bg-brand text-white rounded-lg font-black text-xs uppercase hover:bg-brand-dark transition-all">
            <ArrowUpRight size={14} className="mr-2" /> Log Income
          </button>
        </div>
      </div>

      <FinancialKpiCards 
        kpis={kpis}
        totalProfit={totalProfit}
        isCoopMember={isCoopMember}
      />

      {/* TRANSACTION MATRIX */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="font-black text-xs uppercase text-ink flex items-center gap-2 tracking-widest">
              <Receipt size={14} /> Transaction Matrix
            </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Ref (Code)</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Customer / Supplier</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount (KSh)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingTransactions ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading transactions...</td></tr>
            ) : transactions.length > 0 ? (
              transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">No transactions recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSave={(data) => addExpenseMutation.mutate(data)}
      />
      <IncomeModal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)}
        customers={customers}
        onSave={(data) => addIncomeMutation.mutate(data)}
      />
    </div>
  );
}