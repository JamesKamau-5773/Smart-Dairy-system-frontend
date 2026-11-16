import { useState, useEffect, useMemo } from 'react';
import BaseModal from '../ui/BaseModal';
import { todayLocalIso } from '../../lib/localDate';
import { financeCopy } from '../../i18n/finance';

const INITIAL_STATE = {
  date: todayLocalIso(),
  liters_delivered: '',
  personal_consumption_liters: '0',
  notes: '',
};

export default function DeliveryModal({ isOpen, onClose, onSave, delivery, customer, isSaving }) {
  const copy = financeCopy.delivery;
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
    <BaseModal
      isOpen
      onClose={onClose}
      title={isEditMode ? copy.editTitle : copy.logTitle}
      size="xl"
      closeLabel={copy.close}
      onSubmit={handleSubmit}
      footerActions={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 font-black text-xs text-ink-muted uppercase">
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={isSaving || !formData.date || !formData.liters_delivered || personalUseExceedsDelivered}
            className="flex items-center px-4 py-2 bg-brand text-white rounded-lg font-black text-xs uppercase  hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isEditMode ? copy.saveChanges : copy.log}
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="delivery-date" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">{copy.date}</label>
            <input
              id="delivery-date"
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
            <label htmlFor="delivery-liters-delivered" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">{copy.delivered}</label>
            <input
              id="delivery-liters-delivered"
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
          <label htmlFor="delivery-personal-consumption" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">
            {copy.personal}
          </label>
          <input
            id="delivery-personal-consumption"
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
            {copy.personalHint}
          </p>
          {personalUseExceedsDelivered && (
            <p className="mt-1 text-[10px] font-bold text-danger">
              {copy.personalTooMuch}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div>
            <p className="text-[10px] font-black text-ink-muted uppercase">{copy.billable}</p>
            <p className="text-sm font-black text-ink">{billableLiters.toFixed(1)} L</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-muted uppercase">{copy.estimate}</p>
            <p className="text-sm font-black text-ink">KES {estimatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-ink-muted">{copy.estimateHint}</p>
          </div>
        </div>

        <div>
          <label htmlFor="delivery-notes" className="block text-[10px] font-black text-ink-muted uppercase mb-1.5">{copy.notes}</label>
          <textarea
            id="delivery-notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold h-16"
          />
        </div>
      </div>
    </BaseModal>
  );
}
