import { useState, useEffect, useMemo } from 'react';
import { X, Save, Droplets } from 'lucide-react';

const INITIAL_STATE = {
  date: new Date().toISOString().slice(0, 10),
  liters_delivered: '',
  personal_consumption_liters: '0',
  notes: '',
};

export default function DeliveryModal({ isOpen, onClose, onSave, delivery, customer, isSaving }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const isEditMode = !!delivery;

  useEffect(() => {
    if (!isOpen) return;
    if (delivery) {
      setFormData({
        date: delivery.date || INITIAL_STATE.date,
        liters_delivered: String(delivery.liters_delivered ?? ''),
        personal_consumption_liters: String(delivery.personal_consumption_liters ?? '0'),
        notes: delivery.notes || '',
      });
    } else {
      setFormData(INITIAL_STATE);
    }
  }, [isOpen, delivery]);

  const delivered = Number(formData.liters_delivered) || 0;
  const personalUse = Number(formData.personal_consumption_liters) || 0;
  const billableLiters = Math.max(delivered - personalUse, 0);
  const rate = Number(customer?.agreed_rate_per_liter ?? customer?.agreed_rate) || 0;

  // Informational only — the backend recomputes and owns the authoritative amount.
  const estimatedAmount = useMemo(() => billableLiters * rate, [billableLiters, rate]);

  const personalUseExceedsDelivered = personalUse > delivered;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (personalUseExceedsDelivered) return;

    onSave({
      id: delivery?.id,
      customer_id: customer?.id,
      date: formData.date,
      liters_delivered: delivered,
      personal_consumption_liters: personalUse,
      notes: formData.notes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-ink text-sm uppercase tracking-widest flex items-center gap-2">
            <Droplets size={16} className="text-brand" />
            {isEditMode ? 'Edit Milk Delivery' : 'Log Milk Delivery'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Delivery Date</label>
              <input
                required
                name="date"
                value={formData.date}
                onChange={handleChange}
                type="date"
                disabled={isSaving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Liters Delivered</label>
              <input
                required
                name="liters_delivered"
                value={formData.liters_delivered}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.1"
                placeholder="0.0"
                disabled={isSaving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">
              Personal Consumption (Not Billable)
            </label>
            <input
              name="personal_consumption_liters"
              value={formData.personal_consumption_liters}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.1"
              placeholder="0.0"
              disabled={isSaving}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
            />
            <p className="mt-1 text-[10px] text-ink-muted">
              Liters kept out of this delivery for the farmer's own use — excluded from the customer's bill.
            </p>
            {personalUseExceedsDelivered && (
              <p className="mt-1 text-[10px] font-bold text-danger">
                Personal consumption cannot exceed liters delivered.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div>
              <p className="text-[10px] font-black text-ink-muted uppercase">Billable Liters</p>
              <p className="text-sm font-black text-ink">{billableLiters.toFixed(1)} L</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-ink-muted uppercase">Estimated Amount</p>
              <p className="text-sm font-black text-ink">KSh {estimatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-ink-muted">Final amount is confirmed by the backend.</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold h-16"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 font-black text-xs text-ink-muted uppercase">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.date || !formData.liters_delivered || personalUseExceedsDelivered}
              className="flex items-center px-4 py-2 bg-brand text-white rounded-lg font-black text-xs uppercase shadow-sm hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Save size={14} className="mr-2" /> {isEditMode ? 'Save Changes' : 'Log Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
