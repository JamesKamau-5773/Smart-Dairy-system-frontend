import React from 'react';
import { staffCopy } from '../../../i18n/staff';

export default function MedicalCertificationsTab({ medicalData, setMedicalData, onSubmit, onClose }) {
  const copy = staffCopy.drawer;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4">
        <label className="space-y-1.5">
          <span className="text-field-label text-ink-muted">{copy.certifications}</span>
          <textarea
            rows="4"
            value={medicalData.certificationsText}
            onChange={(event) => setMedicalData((current) => ({ ...current, certificationsText: event.target.value }))}
            placeholder={copy.certificationsPlaceholder}
            className="input-machined w-full text-control"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-field-label text-ink-muted">{copy.medicalNotes}</span>
          <textarea
            rows="4"
            value={medicalData.notes}
            onChange={(event) => setMedicalData((current) => ({ ...current, notes: event.target.value }))}
            placeholder={copy.medicalPlaceholder}
            className="input-machined w-full text-control"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-control text-gray-600 transition-colors hover:bg-gray-50"
        >
          {copy.close}
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-control text-white transition-colors hover:bg-brand-dark"
        >
          {copy.saveCertifications}
        </button>
      </div>
    </form>
  );
}