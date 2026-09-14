import { useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, Upload } from 'lucide-react';
import { validateForm, ValidationRules, getFirstErrorMessage } from '../../../lib/validation';
import {
  normalizeSemenCode,
  resolveCowIdentity,
  normalizeBreedingLogPayload,
  normalizeBreedingLog,
} from '../../../lib/breedingUtils';
import { createAuditEntry, logToAuditTrail } from '../../../lib/audit';
import { breedingApi } from '../../../lib/backendApi';
import { useTenant } from '../../../hooks/useTenant';

/**
 * LogAIServiceForm
 *
 * Extracted form component for logging AI services.
 * Handles:
 * - Cow selection with autocomplete
 * - AI date, sire code, semen source
 * - Form validation and submission
 * - Cache management and audit logging
 */
export default function LogAIServiceForm({
  herdOptions = [],
  onSuccess,
  onError,
  isSaving = false,
  onSavingChange,
  initialData = {},
}) {
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();

  // Form state
  const [logForm, setLogForm] = useState({
    cowId: initialData.cowId || '',
    aiDate: initialData.aiDate || '',
    aiTime: initialData.aiTime || '',
    sireCode: initialData.sireCode || '',
    semenSource: initialData.semenSource || 'farm_stock',
    technician: initialData.technician || initialData.technician_name || '',
    ownerName: initialData.ownerName || initialData.owner_name || '',
    farmLocation: initialData.farmLocation || initialData.farm_location || '',
    certificateNumber: initialData.certificateNumber || initialData.certificate_number || '',
    serviceFee: initialData.serviceFee ?? initialData.service_fee ?? '',
    isRepeatService: Boolean(initialData.isRepeatService ?? initialData.is_repeat_service ?? false),
    note: initialData.note || initialData.notes || '',
    heatObservationId: initialData.heatObservationId || initialData.heat_observation_id || null,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isCowPickerOpen, setIsCowPickerOpen] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const cowPickerRef = useRef(null);

  // Filter cow options based on input
  const filteredCowOptions = useMemo(() => {
    const query = logForm.cowId.trim().toLowerCase();
    if (!query) return herdOptions.slice(0, 12);

    return herdOptions
      .filter((option) => (
        option.id.toLowerCase().includes(query)
        || option.name.toLowerCase().includes(query)
        || option.display.toLowerCase().includes(query)
      ))
      .slice(0, 12);
  }, [herdOptions, logForm.cowId]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cowPickerRef.current && !cowPickerRef.current.contains(event.target)) {
        setIsCowPickerOpen(false);
      }
    };

    if (!isCowPickerOpen) return undefined;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCowPickerOpen]);

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormErrors({});

    // Validate
    const validationSchema = {
      cowId: [ValidationRules.required],
      sireCode: [ValidationRules.required],
      semenSource: [ValidationRules.required],
    };

    const errors = validateForm(logForm, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const errorMsg = getFirstErrorMessage(errors);
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      onSavingChange?.(true);

      const resolvedCow = resolveCowIdentity(logForm.cowId, herdOptions);

      const payload = normalizeBreedingLogPayload({
        cowId: resolvedCow.id,
        cow_name: resolvedCow.name,
        event_date: logForm.aiDate || new Date().toISOString().slice(0, 10),
        insemination_time: logForm.aiTime,
        sireCode: logForm.sireCode,
        semenSource: logForm.semenSource,
        technician_name: logForm.technician,
        owner_name: logForm.ownerName,
        farm_location: logForm.farmLocation,
        certificate_number: logForm.certificateNumber,
        service_fee: logForm.serviceFee,
        is_repeat_service: logForm.isRepeatService,
        notes: logForm.note.trim(),
        heat_observation_id: logForm.heatObservationId,
        eventType: 'INSEMINATION',
      });

      if (!payload) {
        const errorMsg = 'Failed to create a valid breeding log. Please check the required fields.';
        onError?.(errorMsg);
        toast.error(errorMsg);
        onSavingChange?.(false);
        return;
      }

      const createResponse = await breedingApi.createLog(payload);

      let savedLog = normalizeBreedingLog({
        ...createResponse,
        cowId: createResponse?.cow_id ?? createResponse?.cowId ?? payload.animal_id,
        cowName: createResponse?.cow_name ?? createResponse?.cowName ?? resolvedCow.name,
        aiDate: createResponse?.insemination_date ?? createResponse?.aiDate ?? payload.event_date,
        sireCode: createResponse?.external_sire_code ?? createResponse?.semen_id ?? createResponse?.sireCode ?? payload.sire_id,
        semenSource: createResponse?.semen_source
          ?? (String(createResponse?.provided_by ?? '').toUpperCase() === 'VET' ? 'vet_provided' : null)
          ?? logForm.semenSource,
        expectedCalvingDate: createResponse?.expected_calving_date ?? createResponse?.expectedCalvingDate ?? null,
        status: createResponse?.status ?? 'Pending',
      });

      let certificateUploaded = false;
      if (certificateFile && savedLog.id) {
        try {
          const certificateResponse = await breedingApi.uploadCertificate(savedLog.id, certificateFile);
          savedLog = normalizeBreedingLog({ ...savedLog, ...certificateResponse });
          certificateUploaded = true;
        } catch (certificateError) {
          console.error('AI certificate upload failed:', certificateError);
          toast.error('AI record was saved, but the certificate could not be uploaded. Please retry the attachment.');
        }
      }

      if (!savedLog.semenSource) {
        savedLog.semenSource = logForm.semenSource;
      }

      logToAuditTrail(
        createAuditEntry({
          action: 'create',
          recordType: 'ai_service',
          recordId: savedLog.id,
          userName: 'You',
          notes: `Logged AI service for ${savedLog.cowId} with sire ${savedLog.sireCode}`,
        })
      );

      // Invalidate cache and notify success
      await queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] });

      const reminderSuffix = savedLog.pregnancyCheckDate
        ? ` Pregnancy check reminder scheduled for ${savedLog.pregnancyCheckDate}.`
        : '';
      const certificateSuffix = certificateUploaded ? ' Certificate uploaded.' : '';
      const successMsg = `Logged AI service for ${savedLog.cowId}.${certificateSuffix}${reminderSuffix}`;
      onSuccess?.(savedLog, successMsg);
      toast.success(successMsg);

      // Reset form
      setLogForm({
        cowId: '',
        aiDate: '',
        aiTime: '',
        sireCode: '',
        semenSource: 'farm_stock',
        technician: '',
        ownerName: '',
        farmLocation: '',
        certificateNumber: '',
        serviceFee: '',
        isRepeatService: false,
        note: '',
        heatObservationId: null,
      });
      setCertificateFile(null);
      setIsCowPickerOpen(false);
    } catch (error) {
      console.error('Error logging service:', error);
      const errorMsg = error?.response?.data?.error || 'Failed to log AI service. Please try again.';
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="border-b border-ink/10 pb-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-brand">Service Details</h4>
        </div>

        {/* Cow Selection */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Cow ID or Name *</label>
          <div className="relative" ref={cowPickerRef}>
            <input
              className={`input-machined w-full pr-10 ${formErrors.cowId ? 'border-rose-300 bg-rose-50' : ''}`}
              value={logForm.cowId}
              onFocus={() => setIsCowPickerOpen(true)}
              onChange={(event) => {
                setLogForm((current) => ({ ...current, cowId: event.target.value }));
                setIsCowPickerOpen(true);
                if (formErrors.cowId) setFormErrors({ ...formErrors, cowId: null });
              }}
              placeholder="Type cow ID or name, or pick from herd list"
              aria-invalid={!!formErrors.cowId}
              aria-expanded={isCowPickerOpen}
              aria-autocomplete="list"
            />
            <button
              type="button"
              onClick={() => setIsCowPickerOpen((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted transition-colors hover:text-brand"
              aria-label="Toggle herd suggestions"
            >
              <ChevronDown size={16} />
            </button>

            {isCowPickerOpen && (
              <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-ink/10 bg-surface shadow-lg">
                {filteredCowOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-ink-muted">No herd matches found for this tenant.</div>
                ) : (
                  filteredCowOptions.map((option) => (
                    <button
                      key={`cow-option-${option.id}`}
                      type="button"
                      onClick={() => {
                        setLogForm((current) => ({ ...current, cowId: option.display }));
                        setIsCowPickerOpen(false);
                        if (formErrors.cowId) setFormErrors({ ...formErrors, cowId: null });
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-ink/5 px-3 py-2 text-left last:border-b-0 hover:bg-brand/5"
                    >
                      <span className="text-sm font-semibold text-ink-strong">{option.id}</span>
                      <span className="truncate text-xs text-ink-muted">{option.name || 'No name'}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {herdOptions.length > 0 && (
            <p className="mt-1 text-[11px] text-ink-muted">Suggestions include all herd cows in the active tenant/farm. You can enter either cow ID or cow name.</p>
          )}
          {formErrors.cowId && <p className="mt-1 text-xs text-rose-600">{formErrors.cowId}</p>}
        </div>

        {/* AI Date, Time & Sire Code */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Date *</label>
            <input
              type="date"
              className="input-machined w-full"
              value={logForm.aiDate}
              onChange={(event) => setLogForm((current) => ({ ...current, aiDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">AI Time</label>
            <input
              type="time"
              className="input-machined w-full"
              value={logForm.aiTime}
              onChange={(event) => setLogForm((current) => ({ ...current, aiTime: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Upload size={13} /> AI Certificate Image
          </label>
          <input
            type="file"
            accept="image/*"
            className="input-machined w-full text-sm"
            onChange={(event) => setCertificateFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-ink-muted">Optional. The image is attached to this AI record after it is created.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Technician Name</label>
            <input
              className="input-machined w-full"
              value={logForm.technician}
              onChange={(event) => setLogForm((current) => ({ ...current, technician: event.target.value }))}
              placeholder="e.g. Dr. Njeri"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Sire Code *</label>
            <input
              className={`input-machined w-full ${formErrors.sireCode ? 'border-rose-300 bg-rose-50' : ''}`}
              value={logForm.sireCode}
              onChange={(event) => {
                setLogForm((current) => ({ ...current, sireCode: normalizeSemenCode(event.target.value) }));
                if (formErrors.sireCode) setFormErrors({ ...formErrors, sireCode: null });
              }}
              placeholder="e.g. FR-889"
            />
            {formErrors.sireCode && <p className="mt-1 text-xs text-rose-600">{formErrors.sireCode}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Owner Name</label>
            <input
              className="input-machined w-full"
              value={logForm.ownerName}
              onChange={(event) => setLogForm((current) => ({ ...current, ownerName: event.target.value }))}
              placeholder="e.g. Elizabeth Mugo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Farm / Location</label>
            <input
              className="input-machined w-full"
              value={logForm.farmLocation}
              onChange={(event) => setLogForm((current) => ({ ...current, farmLocation: event.target.value }))}
              placeholder="e.g. Bahati"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Certificate Number</label>
            <input
              className="input-machined w-full"
              value={logForm.certificateNumber}
              onChange={(event) => setLogForm((current) => ({ ...current, certificateNumber: event.target.value }))}
              placeholder="e.g. AI-817"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Service Fee (KES)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-machined w-full"
              value={logForm.serviceFee}
              onChange={(event) => setLogForm((current) => ({ ...current, serviceFee: event.target.value }))}
              placeholder="2500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-surface-raised p-3">
          <input
            id="repeat-service"
            type="checkbox"
            checked={logForm.isRepeatService}
            onChange={(event) => setLogForm((current) => ({ ...current, isRepeatService: event.target.checked }))}
          />
          <label htmlFor="repeat-service" className="text-sm font-semibold text-ink-strong cursor-pointer">
            Repeat service
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">Notes</label>
          <textarea
            className="input-machined w-full min-h-[96px]"
            value={logForm.note}
            onChange={(event) => setLogForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional service notes"
          />
        </div>

        {/* Semen Source */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink-muted">Semen Source *</label>
          <div className={`grid grid-cols-1 gap-2 rounded-lg border p-2 md:grid-cols-2 ${formErrors.semenSource ? 'border-rose-300 bg-rose-50' : 'border-ink/10 bg-surface-raised'}`}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
              <input
                type="radio"
                name="semen-source"
                value="farm_stock"
                checked={logForm.semenSource === 'farm_stock'}
                onChange={(event) => {
                  setLogForm((current) => ({ ...current, semenSource: event.target.value }));
                  if (formErrors.semenSource) setFormErrors({ ...formErrors, semenSource: null });
                }}
              />
              Farm Stock
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink-strong hover:border-brand/30">
              <input
                type="radio"
                name="semen-source"
                value="vet_provided"
                checked={logForm.semenSource === 'vet_provided'}
                onChange={(event) => {
                  setLogForm((current) => ({ ...current, semenSource: event.target.value }));
                  if (formErrors.semenSource) setFormErrors({ ...formErrors, semenSource: null });
                }}
              />
              Vet Provided
            </label>
          </div>
          {formErrors.semenSource && <p className="mt-1 text-xs text-rose-600">{formErrors.semenSource}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-command px-4 py-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Service'}
        </button>
      </div>
    </form>
  );
}
