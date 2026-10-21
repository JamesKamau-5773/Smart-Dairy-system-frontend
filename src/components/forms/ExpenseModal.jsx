import React from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Building, CreditCard, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const COST_CLASSES = [
  ['production_cost', 'Direct Farm Costs'],
  ['operating_cost', 'General Running Costs'],
  ['customer_acquisition', 'Selling & Delivery'],
  ['capital_expenditure', 'Major Purchases (Assets)'],
];

const COST_CLASS_DEFINITIONS = [
  ['production_cost', 'Money spent directly on the cows and milk production, such as feeds, supplements, AI services, and veterinary bills.'],
  ['operating_cost', 'Day-to-day farm overhead not directly tied to a specific cow, like electricity, water, fuel, and permanent staff wages.'],
  ['customer_acquisition', 'Costs related to getting your milk to the buyer, including transport, packaging, marketing, and vendor fees.'],
  ['capital_expenditure', 'Big, long-term investments for the farm, such as buying new machinery, building sheds, or purchasing new livestock.'],
];

const INITIAL_STATE = {
  date: '',
  amount: '',
  paidTo: '',
  itemName: '',
  quantity: '',
  category: 'Feed Purchase',
  costClass: 'production_cost',
  paymentMethod: 'M-Pesa',
  reference: '',
  notes: ''
};

export default function ExpenseModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = React.useState(INITIAL_STATE);

  if (!isOpen) return null;

  const closeAndReset = () => {
    setFormData(INITIAL_STATE);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      item_name: formData.itemName.trim(),
      quantity: parseFloat(formData.quantity),
      cost_class: formData.costClass,
    });
    closeAndReset();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink-strong/30 p-3 backdrop-blur-sm touch-pan-y sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Log new expense" className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white touch-pan-y">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-ink text-sm uppercase tracking-widest">Log New Expense</h3>
          <button onClick={closeAndReset} className="p-1 hover:bg-slate-200 rounded transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-date" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Date of Expense</label>
              <input id="expense-date" required name="date" value={formData.date} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
            <div>
              <label htmlFor="expense-amount" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Amount Spent (KES)</label>
              <input id="expense-amount" required name="amount" value={formData.amount} onChange={handleChange} type="number" placeholder="0.00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="expense-cost-class" className="block text-[10px] font-black text-ink-muted uppercase">Cost Classification</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex text-slate-500 transition-colors hover:text-brand" aria-label="Explain cost classifications">
                    <Info size={14} aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-80 space-y-3">
                  <div className="space-y-2 text-xs leading-relaxed text-slate-600">
                    {COST_CLASS_DEFINITIONS.map(([value, definition]) => (
                      <div key={value}>
                        <p className="font-bold text-slate-900">{COST_CLASSES.find(([classValue]) => classValue === value)?.[1]}</p>
                        <p>{definition}</p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <select
              id="expense-cost-class"
              required
              name="costClass"
              value={formData.costClass}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white">
              {COST_CLASSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="expense-paid-to" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Who did you pay?</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input id="expense-paid-to" required name="paidTo" value={formData.paidTo} onChange={handleChange} placeholder="e.g. AgroVet Supply" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
          </div>

          <div>
            <label htmlFor="expense-item-name" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Item / commodity name</label>
            <input
              id="expense-item-name"
              required
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="e.g. Maize Meal, Dairy Meal, Vet Drugs"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
            />
          </div>

          <div>
            <label htmlFor="expense-quantity" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Quantity</label>
            <input
              id="expense-quantity"
              required
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              type="number"
              min="0.001"
              step="0.001"
              placeholder="e.g. 50"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-category" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">What was this for?</label>
              <select
                id="expense-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white">
                <option value="Salary Advance">Salary Advance</option>
                <option value="Feed Purchase">Feed Purchase</option>
                <option value="Vet Services">Vet Services</option>
                <option value="Labor / Wages">Labor / Wages</option>
                <option value="Equipment Maintenance">Equipment Maintenance</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="expense-payment-method" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Payment Method</label>
              <select
                id="expense-payment-method"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white">
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="expense-reference" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Transaction Reference (Code)</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input id="expense-reference" name="reference" value={formData.reference} onChange={handleChange} placeholder="e.g. QJ12ABC345" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold" />
            </div>
          </div>

          <div>
            <label htmlFor="expense-notes" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Additional Details</label>
            <textarea id="expense-notes" name="notes" value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold h-20" />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeAndReset} className="px-4 py-2 font-black text-xs text-ink-muted uppercase">Cancel</button>
            <button type="submit"
              disabled={!formData.date || !formData.amount || !formData.paidTo || !formData.itemName.trim() || !formData.quantity}
              className="flex items-center px-4 py-2 bg-danger text-white rounded-lg font-black text-xs uppercase  hover:bg-danger/90 disabled:bg-slate-300 disabled:cursor-not-allowed">
              <Save size={14} className="mr-2" /> Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
