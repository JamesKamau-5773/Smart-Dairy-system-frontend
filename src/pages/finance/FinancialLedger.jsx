import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../hooks/useTenant';
import { QUERY_KEYS } from '../../providers/QueryProvider';
import apiClient from '../../lib/apiClient';
import { financeApi } from '../../lib/backendApi';
import { Wallet, ArrowUpRight, ArrowDownLeft, Receipt, ShieldCheck, Sun, Moon } from 'lucide-react';
import ExpenseModal from '../../components/forms/ExpenseModal';
import IncomeModal from '../../components/forms/IncomeModal';
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

  const [transactions, setTransactions] = useState([]);

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
      onSuccess: (newTransaction) => {
        // Optimistically update the local state
        setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      },
      onError: (error) => {
        console.error(`Failed to add ${transactionType}:`, error);
      },
    });
  };

  const addIncomeMutation = useTransactionMutation('income');
  const addExpenseMutation = useTransactionMutation('expense');

  const kpis = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'income') {
        acc.totalIncome += tx.amount;
      } else {
        acc.totalCosts += Math.abs(tx.amount);
      }
      return acc;
    }, { totalIncome: 0, totalCosts: 0 });
  }, [transactions]);

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

      {/* KPI CARDS - Updated to 4-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Total Profit */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Profit</span>
          <div className="text-xl font-black text-ink mt-2">KSh {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">// Profit this season</p>
        </div>

        {/* Total Costs */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Costs</span>
          <div className="text-xl font-black text-danger mt-2">KSh {kpis.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">// Money spent this season</p>
        </div>

        {/* Dynamic Card (Payout/Sales) */}
        {isCoopMember ? (
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payout Breakdown</span>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-ink">Cash in hand</span><span className="text-xs font-black text-brand">75%</span></div>
              <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                 <div className="h-full bg-brand w-[75%]"></div>
                 <div className="h-full bg-slate-300 w-[25%]"></div>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-3 italic">// 25% saved for you.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Income</span>
            <div className="text-xl font-black text-brand mt-4">KSh {kpis.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] font-bold text-slate-400 mt-2">// Total from all sales</p>
          </div>
        )}

        {/* Tax Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tax Status</span>
          <div className="mt-4 flex items-center gap-3">
             <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg"> <ShieldCheck size={18} /> </div>
             <div className="font-black text-xs text-ink">eTIMS sync active</div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">// Linked to: Bahati_01</p>
        </div>
      </div>

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
            {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
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
        onSave={(data) => addIncomeMutation.mutate(data)}
      />
    </div>
  );
}