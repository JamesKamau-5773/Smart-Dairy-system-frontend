import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Filter,
  HeartPulse,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  X,
} from 'lucide-react';
import LABELS from '../../lib/labels';
import AlertBanner from '../../components/ui/AlertBanner';
import Modal from '../../components/ui/Modal';
import { createAuditEntry, getRelativeTime, logToAuditTrail } from '../../lib/audit';
import { formatValidationErrors, getFirstErrorMessage, validateForm } from '../../lib/validation';
import { medicalApi } from '../../lib/backendApi';

const EMPTY_FORM = {
  cowTag: '',
  date: new Date().toISOString().split('T')[0],
  symptoms: '',
  diagnosis: '',
  medications: '',
  recommendations: '',
  vet: 'Dr. A. Njoroge',
  status: 'Under Treatment',
  severity: 'Medium',
  followUp: '',
};

const SEVERITY_STYLES = {
  High: 'bg-[#fff1f2] text-[#b91c1c] border-[#fecdd3]',
  Medium: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  Low: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
};

const STATUS_STYLES = {
  'Under Treatment': 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
  'Follow-up Due': 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
  Closed: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
};

export default function VetRecords() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { data: backendRecords } = useQuery({
    queryKey: ['medical-records'],
    queryFn: () => medicalApi.listRecords(),
  });

  const createRecordMutation = useMutation({
    mutationFn: (payload) => medicalApi.createRecord(payload),
    onSuccess: (record) => {
      setRecords((current) => [record, ...current.filter((entry) => entry.id !== record.id)]);
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setSelectedRecord(record);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setErrorMessage('');
      setShowError(false);
      setSuccessMessage(`Medical record saved for ${record.cow || form.cowTag}.`);
      setShowSuccess(true);
    },
    onError: () => {
      setErrorMessage('Failed to save the medical record. Please try again.');
      setShowError(true);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (Array.isArray(backendRecords)) {
      setRecords(backendRecords);
    }
  }, [backendRecords]);

  const stats = useMemo(() => {
    const open = records.filter((record) => record.status !== 'Closed').length;
    const critical = records.filter((record) => record.severity === 'High').length;
    const dueToday = records.filter((record) => record.followUp === new Date().toISOString().split('T')[0]).length;
    const resolved = records.filter((record) => record.status === 'Closed').length;

    return {
      total: records.length,
      open,
      critical,
      dueToday,
      resolved,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesQuery = !normalizedQuery || [record.cow, record.diagnosis, record.reason, record.vet, record.status, record.severity]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || record.severity === severityFilter;

      return matchesQuery && matchesStatus && matchesSeverity;
    });
  }, [records, query, statusFilter, severityFilter]);

  const activeFilterCount = [query.trim(), statusFilter !== 'All', severityFilter !== 'All'].filter(Boolean).length;

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const handleSaveRecord = (event) => {
    event.preventDefault();

    const errors = validateForm(form, {
      cowTag: ['required', { minLength: 3 }],
      symptoms: ['required', { minLength: 8 }],
      diagnosis: ['required', { minLength: 3 }],
      medications: ['required', { minLength: 3 }],
      recommendations: ['required', { minLength: 8 }],
      vet: ['required', { minLength: 3 }],
      followUp: ['required'],
    });

    if (Object.keys(errors).length > 0) {
      const formattedErrors = formatValidationErrors(errors);
      setFormErrors(formattedErrors);
      setErrorMessage(getFirstErrorMessage(formattedErrors) || 'Please correct the highlighted fields.');
      setShowError(true);
      return;
    }

    setIsSaving(true);

    const nextRecord = {
      date: form.date,
      cow: form.cowTag,
      reason: form.symptoms,
      diagnosis: form.diagnosis,
      meds: form.medications,
      recommendations: form.recommendations,
      status: form.status,
      severity: form.severity,
      vet: form.vet,
      followUp: form.followUp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: form.vet,
    };

    createRecordMutation.mutate(nextRecord, {
      onSuccess: (savedRecord) => {
        logToAuditTrail(createAuditEntry('create', 'medical-record', savedRecord, form.vet));
      },
    });
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('All');
    setSeverityFilter('All');
  };

  return (
    <div className="animate-reveal space-y-6">
      {showError && (
        <div className="fixed right-4 top-4 z-50 w-[min(92vw,440px)]">
          <AlertBanner
            type="danger"
            title="Record not saved"
            message={errorMessage}
            onDismiss={() => setShowError(false)}
          />
        </div>
      )}

      {showSuccess && (
        <div className="fixed right-4 top-4 z-50 w-[min(92vw,440px)]">
          <AlertBanner
            type="success"
            title="Medical record saved"
            message={successMessage}
            autoDismiss={2400}
            onAutoDismiss={() => setShowSuccess(false)}
          />
        </div>
      )}

      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
              <ClipboardList size={12} /> Clinical Operations
            </div>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand sm:text-4xl">{LABELS.MEDICAL_RECORDS}</h2>
            <p className="max-w-2xl text-sm leading-6 text-ink">Track vet visits, diagnoses, treatment plans, and follow-ups in a way the whole farm team can act on quickly.</p>
          </div>

          <button onClick={() => setShowForm((current) => !current)} className="btn-command inline-flex items-center gap-2 self-start lg:self-auto">
            <Plus size={16} /> {showForm ? LABELS.CANCEL : LABELS.LOG_NEW_VISIT}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Open cases</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.open}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-brand shadow-sm"><Clock3 size={18} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Critical cases</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.critical}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-danger shadow-sm"><ShieldAlert size={18} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Follow-ups due</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.dueToday}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-brand shadow-sm"><CalendarDays size={18} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Resolved</p>
                <p className="mt-2 text-3xl font-black text-ink">{stats.resolved}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-success shadow-sm"><CheckCircle2 size={18} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-surface/90 p-4 sm:p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              <Search size={12} /> Search and filters
            </div>
            <p className="text-sm leading-6 text-ink-muted">Narrow the registry by cow, status, or clinical severity.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-ink/10 bg-surface-warm/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              {activeFilterCount} active
            </span>
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand/20 hover:bg-brand/5 hover:text-brand"
            >
              {filtersOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {filtersOpen ? 'Hide filters' : 'Show filters'}
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto] lg:items-end">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                <Search size={12} /> Search records
              </span>
              <div className="relative">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input-machined w-full pl-10"
                  placeholder="Cow, diagnosis, vet, status"
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
                <option value="Under Treatment">Under Treatment</option>
                <option value="Follow-up Due">Follow-up Due</option>
                <option value="Closed">Closed</option>
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
        )}
      </div>

      {showForm && (
        <div className="card-machined border-brand/20 bg-surface/90 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand"><Stethoscope size={18} /></div>
            <div>
              <h3 className="font-bold text-brand text-base sm:text-lg">{LABELS.LOG_NEW_CLINICAL}</h3>
              <p className="text-sm text-ink leading-6">Capture enough detail for the next shift to continue treatment without guessing.</p>
            </div>
          </div>

          <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={handleSaveRecord}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Cow Tag No. *</label>
              <input
                className={`input-machined w-full ${formErrors.cowTag ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="e.g. C-101"
                value={form.cowTag}
                onChange={(event) => handleFieldChange('cowTag', event.target.value)}
                aria-invalid={!!formErrors.cowTag}
                aria-describedby={formErrors.cowTag ? 'cowTag-error' : undefined}
              />
              {formErrors.cowTag && <p id="cowTag-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.cowTag}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Date *</label>
              <input
                type="date"
                className="input-machined w-full"
                value={form.date}
                onChange={(event) => handleFieldChange('date', event.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Signs of sickness *</label>
              <textarea
                className={`input-machined min-h-[110px] w-full ${formErrors.symptoms ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Detailed description of symptoms..."
                value={form.symptoms}
                onChange={(event) => handleFieldChange('symptoms', event.target.value)}
                aria-invalid={!!formErrors.symptoms}
                aria-describedby={formErrors.symptoms ? 'symptoms-error' : undefined}
              />
              {formErrors.symptoms && <p id="symptoms-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.symptoms}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">{LABELS.DIAGNOSIS} *</label>
              <input
                className={`input-machined w-full ${formErrors.diagnosis ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="e.g. Mastitis, Milk Fever"
                value={form.diagnosis}
                onChange={(event) => handleFieldChange('diagnosis', event.target.value)}
                aria-invalid={!!formErrors.diagnosis}
                aria-describedby={formErrors.diagnosis ? 'diagnosis-error' : undefined}
              />
              {formErrors.diagnosis && <p id="diagnosis-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.diagnosis}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">{LABELS.MEDICATIONS_PRESCRIBED} *</label>
              <input
                className={`input-machined w-full ${formErrors.medications ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Name and dosage"
                value={form.medications}
                onChange={(event) => handleFieldChange('medications', event.target.value)}
                aria-invalid={!!formErrors.medications}
                aria-describedby={formErrors.medications ? 'medications-error' : undefined}
              />
              {formErrors.medications && <p id="medications-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.medications}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">{LABELS.RECOMMENDATIONS_REMARKS} *</label>
              <textarea
                className={`input-machined min-h-[100px] w-full ${formErrors.recommendations ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Follow-up instructions..."
                value={form.recommendations}
                onChange={(event) => handleFieldChange('recommendations', event.target.value)}
                aria-invalid={!!formErrors.recommendations}
                aria-describedby={formErrors.recommendations ? 'recommendations-error' : undefined}
              />
              {formErrors.recommendations && <p id="recommendations-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.recommendations}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Vet *</label>
              <input
                className={`input-machined w-full ${formErrors.vet ? 'border-rose-300 bg-rose-50' : ''}`}
                placeholder="Vet name"
                value={form.vet}
                onChange={(event) => handleFieldChange('vet', event.target.value)}
                aria-invalid={!!formErrors.vet}
                aria-describedby={formErrors.vet ? 'vet-error' : undefined}
              />
              {formErrors.vet && <p id="vet-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.vet}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Follow-up date *</label>
              <input
                type="date"
                className={`input-machined w-full ${formErrors.followUp ? 'border-rose-300 bg-rose-50' : ''}`}
                value={form.followUp}
                onChange={(event) => handleFieldChange('followUp', event.target.value)}
                aria-invalid={!!formErrors.followUp}
                aria-describedby={formErrors.followUp ? 'followUp-error' : undefined}
              />
              {formErrors.followUp && <p id="followUp-error" className="mt-1 flex items-center gap-1 text-xs text-rose-600"><AlertCircle size={12} /> {formErrors.followUp}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Severity</label>
              <select className="input-machined w-full" value={form.severity} onChange={(event) => handleFieldChange('severity', event.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-strong">Status</label>
              <select className="input-machined w-full" value={form.status} onChange={(event) => handleFieldChange('status', event.target.value)}>
                <option>Under Treatment</option>
                <option>Follow-up Due</option>
                <option>Closed</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 border-t border-ink/10 pt-2">
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
              <button type="submit" className="btn-command inline-flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={16} />}
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-machined bg-surface/90 overflow-hidden shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-ink/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            <Eye size={12} /> Clinical registry
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-brand/10 text-ink-muted">
            <tr>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">Date</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">Cow</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">Severity</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">Status</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">{LABELS.DIAGNOSIS}</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">{LABELS.MEDICATIONS_PRESCRIBED}</th>
              <th className="p-4 text-[10px] font-bold uppercase text-ink-muted">{LABELS.VIEW_DETAIL}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {filteredRecords.map((visit) => (
              <tr key={visit.id} className="hover:bg-surface/55">
                <td className="p-4 font-mono text-xs text-ink-strong">{visit.date}</td>
                <td className="p-4">
                  <div className="font-bold text-brand">{visit.cow}</div>
                  <div className="text-xs text-ink-muted">Updated {getRelativeTime(visit.updatedAt)} · {visit.updatedBy}</div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[visit.severity]}`}>{visit.severity}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[visit.status]}`}>{visit.status}</span>
                </td>
                <td className="p-4 text-sm text-ink-strong">
                  <div className="max-w-[260px]">
                    <p>{visit.diagnosis}</p>
                    <p className="mt-1 text-xs text-ink-muted">{visit.vet}</p>
                  </div>
                </td>
                <td className="p-4 text-sm text-ink-muted">{visit.meds}</td>
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

            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="mx-auto max-w-md space-y-3 text-ink-muted">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Search size={18} />
                    </div>
                    <p className="font-semibold text-ink">No medical records match the current filters.</p>
                    <p className="text-sm leading-6">Try clearing the filters or searching by cow tag, diagnosis, status, or vet.</p>
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

      <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Medical Record Details">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-ink/10 bg-surface-warm/40 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3 text-brand">
                <FileText size={18} />
                <p className="text-xs font-bold uppercase tracking-wider">Visit Summary</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Date</p>
                  <p className="text-sm font-mono text-ink-strong">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cow</p>
                  <p className="text-sm font-semibold text-brand">{selectedRecord.cow}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Severity</p>
                  <p className="text-sm text-ink-strong">{selectedRecord.severity}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status</p>
                  <p className="text-sm text-ink-strong">{selectedRecord.status}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Signs of sickness</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.reason}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Diagnosis</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Medication plan</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.meds}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Recommendations</p>
                <p className="text-sm leading-6 text-ink-strong">{selectedRecord.recommendations}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 sm:col-span-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Audit trail</p>
                <p className="text-sm leading-6 text-ink-strong">Updated by {selectedRecord.updatedBy} · {getRelativeTime(selectedRecord.updatedAt)}</p>
                <p className="text-xs text-ink-muted">Created at {selectedRecord.createdAt}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-ink/10 pt-4">
              <button onClick={() => setSelectedRecord(null)} className="btn-command bg-surface-raised text-ink inline-flex items-center gap-2">
                <X size={16} /> Close
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
