import React from 'react';

export default function MedicalCertificationsTab({ medicalData, setMedicalData, onSubmit, onClose }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Certifications</span>
          <textarea
            rows="4"
            value={medicalData.certificationsText}
            onChange={(event) => setMedicalData((current) => ({ ...current, certificationsText: event.target.value }))}
            placeholder="Milking hygiene, tractor handling, chemical safety"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Medical notes</span>
          <textarea
            rows="4"
            value={medicalData.notes}
            onChange={(event) => setMedicalData((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Fitness, restrictions, special handling notes"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
        >
          Close
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-brand-dark"
        >
          Save certifications
        </button>
      </div>
    </form>
  );
}