import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  import React, { useMemo, useState } from 'react';
  import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Eye, FileText, Filter, Plus, Search, ShieldAlert, Syringe } from 'lucide-react';
  ClipboardList,
  import AlertBanner from '../../components/ui/AlertBanner';
  Eye,
  import { formatValidationErrors, getFirstErrorMessage, validateForm } from '../../lib/validation';
  import { createAuditEntry, getRelativeTime, logToAuditTrail } from '../../lib/audit';
  FileText,
  Filter,
  HeartPulse,
  Plus,
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [formErrors, setFormErrors] = useState({});
    const [showError, setShowError] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [records, setRecords] = useState([
      {
        id: 'enc_001',
        date: '2026-05-20',
        cow: 'C-101 (Luna)',
        reason: 'Swollen udder',
        diagnosis: 'Mild Mastitis',
        meds: 'Antibiotics (3 days)',
        recommendations: 'Hand-milk for 48hrs, isolate from bulk tank, monitor temperature twice daily.',
        status: 'Under Treatment',
        severity: 'Medium',
        vet: 'Dr. Amina K.',
        followUp: '2026-05-23',
        createdAt: '2026-05-20T08:45:00Z',
        updatedAt: '2026-05-20T09:30:00Z',
        updatedBy: 'Dr. Amina K.',
      },
      {
        id: 'enc_002',
        date: '2026-05-18',
        cow: 'C-84 (Bessie)',
        reason: 'Routine Checkup',
        diagnosis: 'Healthy',
        meds: 'None',
        recommendations: 'Monitor diet and maintain routine vaccination schedule.',
        status: 'Closed',
        severity: 'Low',
        vet: 'Nurse Grace',
        followUp: '2026-06-18',
        createdAt: '2026-05-18T10:10:00Z',
        updatedAt: '2026-05-18T11:05:00Z',
        updatedBy: 'Nurse Grace',
      },
      {
        id: 'enc_003',
        date: '2026-06-15',
        cow: 'C-115 (Maya)',
        reason: 'Loss of appetite and reduced milk yield',
        diagnosis: 'Suspected Ketosis',
        meds: 'Energy tonic and electrolytes',
        recommendations: 'Review ration balance, check water intake, and reassess within 24 hours.',
        status: 'Follow-up Due',
        severity: 'High',
        vet: 'Dr. Amina K.',
        followUp: '2026-06-16',
        createdAt: '2026-06-15T14:20:00Z',
        updatedAt: '2026-06-15T16:05:00Z',
        updatedBy: 'Dr. Amina K.',
      },
      {
        id: 'enc_004',
        date: '2026-06-14',
        cow: 'C-29 (Toto)',
        reason: 'Limping on rear left hoof',
        diagnosis: 'Hoof Abscess',
        meds: 'Hoof wrap and anti-inflammatory',
        recommendations: 'Keep in dry pen, inspect wound daily, and review in 3 days.',
        status: 'Under Treatment',
        severity: 'High',
        vet: 'Dr. Peter O.',
        followUp: '2026-06-18',
        createdAt: '2026-06-14T07:15:00Z',
        updatedAt: '2026-06-14T08:00:00Z',
        updatedBy: 'Dr. Peter O.',
      },
    ]);
    const [form, setForm] = useState({
      cowTag: '',
      date: new Date().toISOString().split('T')[0],
      signs: '',
      diagnosis: '',
      meds: '',
      recommendations: '',
      status: 'Under Treatment',
      severity: 'Medium',
      vet: '',
      followUp: '',
    });

    const stats = useMemo(() => {
      const total = records.length;
      const open = records.filter((record) => record.status !== 'Closed').length;
      const critical = records.filter((record) => record.severity === 'High').length;
      const dueToday = records.filter((record) => record.followUp === new Date().toISOString().split('T')[0]).length;
      return { total, open, critical, dueToday };
    }, [records]);

    const filteredRecords = useMemo(() => {
      return records.filter((record) => {
        const matchesSearch = [record.cow, record.diagnosis, record.reason, record.vet].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    }, [records, searchTerm, statusFilter]);

    const handleSaveRecord = (event) => {
      event.preventDefault();

      const errors = validateForm(form, {
        cowTag: ['required', { minLength: 3 }],
        signs: ['required', { minLength: 8 }],
        diagnosis: ['required', { minLength: 3 }],
        meds: ['required', { minLength: 3 }],
        recommendations: ['required', { minLength: 8 }],
        vet: ['required', { minLength: 3 }],
        followUp: ['required'],
      });

      if (Object.keys(errors).length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        setFormErrors(formattedErrors);
        const message = getFirstErrorMessage(formattedErrors) || 'Please fix the highlighted fields.';
        setErrorMessage(message);
        setShowError(true);
        return;
      }

      const nextRecord = {
        id: `enc_${String(records.length + 1).padStart(3, '0')}`,
        date: form.date,
        cow: form.cowTag,
        reason: form.signs,
        diagnosis: form.diagnosis,
        meds: form.meds,
        recommendations: form.recommendations,
        status: form.status,
        severity: form.severity,
        vet: form.vet,
        followUp: form.followUp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: form.vet,
      };

      setRecords((current) => [nextRecord, ...current]);
      logToAuditTrail(createAuditEntry('create', 'medical-record', nextRecord, form.vet));
      setSelectedRecord(nextRecord);
      setShowForm(false);
      setFormErrors({});
      setSuccessMessage(`Medical record saved for ${form.cowTag}.`);
      setShowSuccess(true);
      setForm({
        cowTag: '',
        date: new Date().toISOString().split('T')[0],
        signs: '',
        diagnosis: '',
        meds: '',
        recommendations: '',
        status: 'Under Treatment',
        severity: 'Medium',
        vet: '',
        followUp: '',
      });
    };
  Search,
  ShieldAlert,
    const encounterStatuses = ['All', 'Under Treatment', 'Follow-up Due', 'Closed'];

    const getSeverityClass = (severity) => {
      if (severity === 'High') return 'bg-[#ffe9ea] text-[#c41230]';
      if (severity === 'Medium') return 'bg-[#fffbf0] text-[#b35c00]';
      return 'bg-[#f2faf6] text-[#1a5c38]';
    };
  const [formData, setFormData] = useState({
    cowTag: '',
      <div className="animate-reveal space-y-6">
        {showError && (
          <div className="fixed right-4 top-4 z-50 w-[min(92vw,420px)]">
            <AlertBanner
              type="danger"
              title="Record not saved"
              message={errorMessage}
              onDismiss={() => setShowError(false)}
            />
          </div>
        )}

        {showSuccess && (
          <div className="fixed right-4 top-4 z-50 w-[min(92vw,420px)]">
            <AlertBanner
              type="success"
              title="Medical record saved"
              message={successMessage}
              autoDismiss={2400}
              onAutoDismiss={() => setShowSuccess(false)}
            />
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
              <ShieldAlert size={12} /> Clinical Operations
            </div>
            <h2 className="mt-3 font-sans text-3xl font-bold text-brand">{LABELS.MEDICAL_RECORDS}</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Track diagnoses, treatment plans, and follow-up actions with clear ownership and audit-ready records.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm(!showForm)} className="btn-command flex items-center gap-2">
              <Plus size={16} /> {showForm ? LABELS.CANCEL : LABELS.LOG_NEW_VISIT}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card-machined bg-surface/90 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Total records</p>
                <p className="mt-2 text-2xl font-black text-ink-strong">{stats.total}</p>
              </div>
              <CalendarDays className="text-brand" size={20} />
            </div>
          </div>
          <div className="card-machined bg-surface/90 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Open cases</p>
                <p className="mt-2 text-2xl font-black text-ink-strong">{stats.open}</p>
              </div>
              <Clock3 className="text-[#b35c00]" size={20} />
            </div>
          </div>
          <div className="card-machined bg-surface/90 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Critical cases</p>
                <p className="mt-2 text-2xl font-black text-ink-strong">{stats.critical}</p>
              </div>
              <ShieldAlert className="text-[#c41230]" size={20} />
            </div>
          </div>
          <div className="card-machined bg-surface/90 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Due today</p>
                <p className="mt-2 text-2xl font-black text-ink-strong">{stats.dueToday}</p>
              </div>
              <CheckCircle2 className="text-[#1a5c38]" size={20} />
            </div>
          </div>
        </div>

        <div className="card-machined bg-surface/90 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-3">
                <Search size={16} className="text-ink-muted" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search cow, diagnosis, vet"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-3">
                <Filter size={16} className="text-ink-muted" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {encounterStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="text-xs text-ink-muted">
              Showing {filteredRecords.length} of {records.length} records
            </div>
          </div>
        </div>

  const [encounters, setEncounters] = useState([
    {
          <div className="card-machined bg-surface/90 p-6 sm:p-8 animate-reveal border-brand/20">
      date: '2026-05-20',
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSaveRecord}>
      reason: 'Swollen udder and reduced appetite',
      diagnosis: 'Mild Mastitis',
                <input
                  className={`input-machined w-full ${formErrors.cowTag ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="e.g. C-101"
                  value={form.cowTag}
                  onChange={(event) => setForm((current) => ({ ...current, cowTag: event.target.value }))}
                  aria-invalid={!!formErrors.cowTag}
                />
                {formErrors.cowTag && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.cowTag}</p>}
      recommendations: 'Hand-milk for 48hrs and monitor milk quality',
      vet: 'Dr. A. Njoroge',
      status: 'Open',
                <input
                  type="date"
                  className={`input-machined w-full ${formErrors.date ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  aria-invalid={!!formErrors.date}
                />
                {formErrors.date && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.date}</p>}
      followUpDate: '2026-05-23',
      updatedAt: '2026-05-20T11:20:00Z',
      updatedBy: 'Vet Team',
                <textarea
                  className={`input-machined min-h-[100px] w-full ${formErrors.signs ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="Detailed description of symptoms..."
                  value={form.signs}
                  onChange={(event) => setForm((current) => ({ ...current, signs: event.target.value }))}
                  aria-invalid={!!formErrors.signs}
                />
                {formErrors.signs && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.signs}</p>}
      notes: 'Milk should not enter bulk tank until cleared.',
    },
    {
                <input
                  className={`input-machined w-full ${formErrors.diagnosis ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="e.g. Mastitis, Milk Fever"
                  value={form.diagnosis}
                  onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))}
                  aria-invalid={!!formErrors.diagnosis}
                />
                {formErrors.diagnosis && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.diagnosis}</p>}
      date: '2026-05-18',
      cow: 'C-84 (Bessie)',
      reason: 'Routine checkup and body condition review',
                <input
                  className={`input-machined w-full ${formErrors.meds ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="Name and dosage"
                  value={form.meds}
                  onChange={(event) => setForm((current) => ({ ...current, meds: event.target.value }))}
                  aria-invalid={!!formErrors.meds}
                />
                {formErrors.meds && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.meds}</p>}
      meds: 'None',
      recommendations: 'Monitor diet and continue routine checks',
      vet: 'Dr. A. Njoroge',
                <textarea
                  className={`input-machined w-full ${formErrors.recommendations ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="Follow-up instructions..."
                  value={form.recommendations}
                  onChange={(event) => setForm((current) => ({ ...current, recommendations: event.target.value }))}
                  aria-invalid={!!formErrors.recommendations}
                />
                {formErrors.recommendations && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.recommendations}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink/60 uppercase">Severity</label>
                <select
                  className="input-machined w-full"
                  value={form.severity}
                  onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink/60 uppercase">Status</label>
                <select
                  className="input-machined w-full"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option>Under Treatment</option>
                  <option>Follow-up Due</option>
                  <option>Closed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink/60 uppercase">Vet</label>
                <input
                  className={`input-machined w-full ${formErrors.vet ? 'border-rose-300 bg-rose-50' : ''}`}
                  placeholder="Vet name"
                  value={form.vet}
                  onChange={(event) => setForm((current) => ({ ...current, vet: event.target.value }))}
                  aria-invalid={!!formErrors.vet}
                />
                {formErrors.vet && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.vet}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink/60 uppercase">Follow-up Date</label>
                <input
                  type="date"
                  className={`input-machined w-full ${formErrors.followUp ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={form.followUp}
                  onChange={(event) => setForm((current) => ({ ...current, followUp: event.target.value }))}
                  aria-invalid={!!formErrors.followUp}
                />
                {formErrors.followUp && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.followUp}</p>}
      severity: 'Low',
      followUpDate: '2026-06-18',
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormErrors({});
                  }}
                  className="btn-command bg-surface-raised text-ink hover:bg-ink/10"
                >
                  {LABELS.CANCEL}
                </button>
                <button type="submit" className="btn-command">
                  Save Record
                </button>
      treatmentPlan: 'No medication required.',
      notes: 'Condition stable and no isolation needed.',
    },
    {
      id: 'enc_003',
      date: '2026-06-12',
        <div className="card-machined bg-surface/90 overflow-hidden">
      reason: 'Limping on rear left leg',
            <thead className="bg-brand/10 text-ink-muted">
      meds: 'Anti-inflammatory gel',
      recommendations: 'Clean stall and review in 48 hours',
      vet: 'Dr. A. Njoroge',
                <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Severity</th>
                <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Status</th>
      status: 'Monitoring',
      severity: 'Medium',
      followUpDate: '2026-06-18',
      updatedAt: '2026-06-12T09:05:00Z',
      updatedBy: 'Vet Team',
      treatmentPlan: 'Inspect hoof, keep stall dry, and limit rough movement.',
              {filteredRecords.map((visit) => (
                <tr key={visit.id} className="hover:bg-surface/55">
                  <td className="p-4 font-mono text-xs text-ink-strong">{visit.date}</td>
                  <td className="p-4">
                    <div className="font-bold text-brand">{visit.cow}</div>
                    <div className="text-xs text-ink-muted">Updated {getRelativeTime(visit.updatedAt)} · {visit.updatedBy}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getSeverityClass(visit.severity)}`}>
                      {visit.severity}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-ink-strong">{visit.status}</td>
                  <td className="p-4 text-sm text-ink-strong">{visit.diagnosis}</td>
                  <td className="p-4 text-sm text-ink-muted">{visit.meds}</td>
    symptoms: (value) => (!value.trim() ? 'Symptoms are required.' : value.trim().length < 8 ? 'Symptoms need more detail.' : null),
    diagnosis: (value) => (!value.trim() ? 'Diagnosis is required.' : null),
    medications: (value) => (!value.trim() ? 'Medication or treatment is required.' : null),
    recommendations: (value) => (!value.trim() ? 'Recommendations are required.' : null),
  };

  const summary = useMemo(() => {
    const critical = encounters.filter((record) => record.severity === 'High').length;
    const openCases = encounters.filter((record) => record.status !== 'Resolved').length;
    const followUpsDue = encounters.filter((record) => record.followUpDate === formData.date || record.followUpDate === '2026-06-18').length;
    const resolvedThisWeek = encounters.filter((record) => record.status === 'Resolved').length;

    return { critical, openCases, followUpsDue, resolvedThisWeek };
  }, [encounters, formData.date]);

  const filteredEncounters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return encounters.filter((record) => {
      const matchesQuery = !normalizedQuery || [record.cow, record.diagnosis, record.reason, record.vet, record.status, record.severity]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || record.severity === severityFilter;

      return matchesQuery && matchesStatus && matchesSeverity;
    });
  }, [encounters, query, statusFilter, severityFilter]);

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('All');
    setSeverityFilter('All');
  };

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((current) => ({ ...current, [field]: null }));
    }
  };
            {filteredRecords.length === 0 && (
              <tr>
                <td className="p-6 text-center text-sm text-ink-muted" colSpan="7">
                  No records match the current search or status filter.
                </td>
              </tr>
            )}

  const handleSaveRecord = (event) => {
    event.preventDefault();

    const errors = {};
    Object.keys(validationRules).forEach((field) => {
      const error = validationRules[field](formData[field]);
      if (error) errors[field] = error;
            <div className="rounded-2xl border border-ink/10 bg-surface-warm/40 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3 text-brand">
                <FileText size={18} />
                <p className="text-xs font-bold uppercase tracking-wider">Visit Summary</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Date</p>
                  <p className="text-sm font-mono text-ink-strong">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cow</p>
                  <p className="text-sm font-semibold text-brand">{selectedRecord.cow}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Updated</p>
                  <p className="text-sm text-ink-strong">{getRelativeTime(selectedRecord.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Signs of Sickness</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.reason}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Diagnosis</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Medication Plan</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.meds}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Follow-up Date</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.followUp}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Recommendations</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.recommendations}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Audit Trail</p>
                <p className="text-sm leading-6 text-ink-strong">Updated by {selectedRecord.updatedBy} · Created {selectedRecord.createdAt}</p>
              </div>
        cowTag: '',
        date: new Date().toISOString().split('T')[0],
        symptoms: '',
        diagnosis: '',
        medications: '',
        recommendations: '',
        vet: 'Dr. A. Njoroge',
        status: 'Open',
        severity: 'Medium',
        followUpDate: '',
      });
      setFormErrors({});
      setErrorMessage('');
      setShowError(false);
      setSuccessMessage('Medical record saved and added to the workflow.');
      setIsSaving(false);
    }, 350);
  };

  const severityTone = {
    High: 'bg-[#fff5f5] text-[#b91c1c] border-[#ef9a9a]',
    Medium: 'bg-[#fff8ed] text-[#a16207] border-[#f5d38b]',
    Low: 'bg-[#f0fdf4] text-[#166534] border-[#86efac]',
  };

  const statusTone = {
    Open: 'bg-[#eff6ff] text-[#1d4ed8] border-[#93c5fd]',
    Monitoring: 'bg-[#fff7ed] text-[#b45309] border-[#fcd34d]',
    Resolved: 'bg-[#f0fdf4] text-[#166534] border-[#86efac]',
  };

  return (
    <div className="animate-reveal space-y-8">
      {showError && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,440px)]">
          <AlertBanner
            type="danger"
            title="Validation required"
            message={errorMessage}
            autoDismiss={4000}
            onDismiss={() => setShowError(false)}
          />
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,440px)]">
          <AlertBanner
            type="success"
            title="Saved"
            message={successMessage}
            autoDismiss={2400}
            onDismiss={() => setSuccessMessage('')}
          />
        </div>
      )}

      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(219,246,247,0.92),rgba(255,255,255,0.96))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(56,189,248,0.10)]">
        <div className="flex flex-col gap-5 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
              <ClipboardList size={12} /> Clinical Operations
            </div>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand sm:text-4xl">
              {LABELS.MEDICAL_RECORDS}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-ink-muted">
              Track vet visits, treatment plans, follow-ups, and case outcomes in a clean operational view.
            </p>
          </div>

          <button onClick={() => setShowForm(!showForm)} className="btn-command inline-flex items-center gap-2 self-start lg:self-auto">
            <Plus size={16} /> {showForm ? LABELS.CANCEL : LABELS.LOG_NEW_VISIT}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Open cases', value: summary.openCases, icon: Activity, tone: 'from-[#dbeafe] to-[#eff6ff]' },
            { label: 'Critical cases', value: summary.critical, icon: ShieldAlert, tone: 'from-[#fee2e2] to-[#fff1f2]' },
            { label: 'Follow-ups due', value: summary.followUpsDue, icon: CalendarDays, tone: 'from-[#fef3c7] to-[#fffbeb]' },
            { label: 'Resolved', value: summary.resolvedThisWeek, icon: CheckCircle2, tone: 'from-[#dcfce7] to-[#f0fdf4]' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-2xl border border-ink/10 bg-gradient-to-br ${item.tone} p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-3xl font-black text-ink">{item.value}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-brand shadow-sm">
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-surface/90 p-4 sm:p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              <Search size={12} /> Search records
            </span>
            <div className="relative">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-machined w-full pl-10"
                placeholder="Cow, diagnosis, vet, or status"
              />
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              <Filter size={12} /> Status
            </span>
            <select className="input-machined w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              <HeartPulse size={12} /> Severity
            </span>
            <select className="input-machined w-full" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="All">All severity</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>

          <button type="button" onClick={clearFilters} className="btn-command bg-surface-raised text-ink h-[46px] self-end">
            Clear filters
          </button>
        </div>
      </div>

      {/* NEW VISIT FORM (Only visible when toggled) */}
      {showForm && (
        <div className="card-machined bg-surface/90 p-5 sm:p-8 animate-reveal border-brand/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-bold text-brand">{LABELS.LOG_NEW_CLINICAL}</h3>
              <p className="text-xs text-ink-muted">Capture the symptoms, treatment, and follow-up so the next person can act quickly.</p>
            </div>
          </div>
          <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={handleSaveRecord}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Cow Tag No. *</label>
              <input
                className={`input-machined w-full ${formErrors.cowTag ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="e.g. C-101"
                value={formData.cowTag}
                onChange={(event) => handleFieldChange('cowTag', event.target.value)}
                aria-invalid={!!formErrors.cowTag}
                aria-describedby={formErrors.cowTag ? 'cowTag-error' : undefined}
              />
              {formErrors.cowTag && (
                <p id="cowTag-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.cowTag}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Date *</label>
              <input
                type="date"
                className="input-machined w-full"
                value={formData.date}
                onChange={(event) => handleFieldChange('date', event.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Signs of Sickness (What did you see?) *</label>
              <textarea
                className={`input-machined min-h-[110px] w-full ${formErrors.symptoms ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Detailed description of symptoms..."
                value={formData.symptoms}
                onChange={(event) => handleFieldChange('symptoms', event.target.value)}
                aria-invalid={!!formErrors.symptoms}
                aria-describedby={formErrors.symptoms ? 'symptoms-error' : undefined}
              />
              {formErrors.symptoms && (
                <p id="symptoms-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.symptoms}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">{LABELS.DIAGNOSIS} *</label>
              <input
                className={`input-machined w-full ${formErrors.diagnosis ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="e.g. Mastitis, Milk Fever"
                value={formData.diagnosis}
                onChange={(event) => handleFieldChange('diagnosis', event.target.value)}
                aria-invalid={!!formErrors.diagnosis}
                aria-describedby={formErrors.diagnosis ? 'diagnosis-error' : undefined}
              />
              {formErrors.diagnosis && (
                <p id="diagnosis-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.diagnosis}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">{LABELS.MEDICATIONS_PRESCRIBED} *</label>
              <input
                className={`input-machined w-full ${formErrors.medications ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Name and dosage"
                value={formData.medications}
                onChange={(event) => handleFieldChange('medications', event.target.value)}
                aria-invalid={!!formErrors.medications}
                aria-describedby={formErrors.medications ? 'medications-error' : undefined}
              />
              {formErrors.medications && (
                <p id="medications-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.medications}</p>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">{LABELS.RECOMMENDATIONS_REMARKS} *</label>
              <textarea
                className={`input-machined min-h-[100px] w-full ${formErrors.recommendations ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Follow-up instructions..."
                value={formData.recommendations}
                onChange={(event) => handleFieldChange('recommendations', event.target.value)}
                aria-invalid={!!formErrors.recommendations}
                aria-describedby={formErrors.recommendations ? 'recommendations-error' : undefined}
              />
              {formErrors.recommendations && (
                <p id="recommendations-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.recommendations}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Vet</label>
              <input
                className="input-machined w-full"
                value={formData.vet}
                onChange={(event) => handleFieldChange('vet', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Status</label>
              <select
                className="input-machined w-full"
                value={formData.status}
                onChange={(event) => handleFieldChange('status', event.target.value)}
              >
                <option>Open</option>
                <option>Monitoring</option>
                <option>Resolved</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Severity</label>
              <select
                className="input-machined w-full"
                value={formData.severity}
                onChange={(event) => handleFieldChange('severity', event.target.value)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-ink/60">Follow-up date</label>
              <input
                type="date"
                className="input-machined w-full"
                value={formData.followUpDate}
                onChange={(event) => handleFieldChange('followUpDate', event.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 border-t border-ink/10 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-command bg-surface-raised text-ink hover:bg-ink/10">{LABELS.CANCEL}</button>
              <button type="submit" className="btn-command inline-flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={16} />}
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISIT HISTORY TABLE */}
      <div className="card-machined bg-surface/90 overflow-hidden shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-ink/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            <Eye size={12} /> Clinical registry
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-brand/10 text-ink-muted">
            <tr>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Date</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Cow</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">{LABELS.DIAGNOSIS}</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Severity</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Status</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">Follow-up</th>
              <th className="p-4 text-[10px] uppercase font-bold text-ink-muted">{LABELS.VIEW_DETAIL}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {filteredEncounters.map((visit) => (
              <tr key={visit.id} className="hover:bg-surface/55">
                <td className="p-4 font-mono text-xs text-ink-strong">{visit.date}</td>
                <td className="p-4 font-semibold text-brand">{visit.cow}</td>
                <td className="p-4 text-sm text-ink-strong">
                  <div className="max-w-[260px]">
                    <p className="font-medium text-ink-strong">{visit.diagnosis}</p>
                    <p className="mt-1 text-xs text-ink-muted">{visit.vet}</p>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${severityTone[visit.severity]}`}>{visit.severity}</span>
                </td>
                <td className="p-4 text-sm">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[visit.status]}`}>{visit.status}</span>
                </td>
                <td className="p-4 text-sm text-ink-muted">{visit.followUpDate}</td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(visit)}
                    className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/15"
                    aria-label={`Open medical record for ${visit.cow}`}
                  >
                    <Eye size={16} />
                    Open File
                  </button>
                </td>
              </tr>
            ))}
            {filteredEncounters.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="mx-auto max-w-md space-y-3 text-ink-muted">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Search size={18} />
                    </div>
                    <p className="font-semibold text-ink">No medical records match the current filters.</p>
                    <p className="text-sm leading-6">Try clearing the filters or searching by cow tag, diagnosis, or vet name.</p>
                    <button type="button" onClick={clearFilters} className="btn-command bg-surface-raised text-ink">
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD DETAIL MODAL */}
      <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Medical Record Details">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-ink/10 bg-surface-warm/40 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3 text-brand">
                <FileText size={18} />
                <p className="text-xs font-bold uppercase tracking-wider">Visit Summary</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Date</p>
                  <p className="text-sm font-mono text-ink-strong">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cow</p>
                  <p className="text-sm font-semibold text-brand">{selectedRecord.cow}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status</p>
                  <p className="text-sm text-ink-strong">{selectedRecord.status}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Severity</p>
                  <p className="text-sm text-ink-strong">{selectedRecord.severity}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Signs of Sickness</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.reason}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Diagnosis</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Treatment Plan</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.treatmentPlan}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Medications Prescribed</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.meds}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Recommendations</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.recommendations}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Operational Notes</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.notes}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-ink/10 bg-surface-warm/30 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Follow-up date</p>
                <p className="text-sm text-ink-strong">{selectedRecord.followUpDate}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Updated by</p>
                <p className="text-sm text-ink-strong">{selectedRecord.updatedBy}</p>
                <p className="text-xs text-ink-muted">{selectedRecord.updatedAt}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button onClick={() => setSelectedRecord(null)} className="btn-command bg-surface-raised text-ink">
                Close
              </button>
              <button className="btn-command">
                Edit Record
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}