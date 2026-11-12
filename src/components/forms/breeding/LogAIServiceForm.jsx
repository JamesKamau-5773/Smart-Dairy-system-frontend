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
import { getApiErrorMessage } from '../../../lib/backendApi';
import { formatCowIdentity } from '../../../lib/cowIdentity';
import { breedingApi } from '../../../lib/backendApi';
import { useTenant } from '../../../hooks/useTenant';
import { todayLocalIso } from '../../../lib/localDate';
import { reportError } from '../../../lib/telemetry';
import { breedingCopy } from '../../../i18n/breeding';

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
  const copy = breedingCopy.service;
  const { tenantId, farmId } = useTenant();
  const queryClient = useQueryClient();
  const editingLogId = initialData.id ?? initialData.log_id ?? null;

  // Form state
  const [logForm, setLogForm] = useState({
    cowId: initialData.cowId || '',
    aiDate: initialData.aiDate || '',
    aiTime: initialData.aiTime || '',
    sireCode: initialData.sireCode || '',
    semenSource: initialData.semenSource || 'farm_stock',
    milkVolumePta: initialData.milkVolumePta ?? initialData.sire_pta_scores?.milk_volume ?? '',
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
        event_date: logForm.aiDate || todayLocalIso(),
        insemination_time: logForm.aiTime,
        sireCode: logForm.sireCode,
        semenSource: logForm.semenSource,
        sire_pta_scores: logForm.semenSource === 'vet_provided' && logForm.milkVolumePta !== ''
          ? { milk_volume: Number(logForm.milkVolumePta) }
          : null,
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
        const errorMsg = copy.prepareFailed;
        onError?.(errorMsg);
        toast.error(errorMsg);
        onSavingChange?.(false);
        return;
      }

      const saveResponse = editingLogId
        ? await breedingApi.updateLog(editingLogId, payload)
        : await breedingApi.createLog(payload);

      let savedLog = normalizeBreedingLog({
        ...saveResponse,
        cowId: saveResponse?.cow_id ?? saveResponse?.cowId ?? payload.cow_id,
        cowName: saveResponse?.cow_name ?? saveResponse?.cowName ?? resolvedCow.name,
        aiDate: saveResponse?.insemination_date ?? saveResponse?.aiDate ?? payload.insemination_date,
        sireCode: saveResponse?.external_sire_code ?? saveResponse?.semen_id ?? saveResponse?.sireCode ?? payload.semen_id,
        semenSource: saveResponse?.semen_source
          ?? (String(saveResponse?.provided_by ?? '').toUpperCase() === 'VET' ? 'vet_provided' : null)
          ?? logForm.semenSource,
        expectedCalvingDate: saveResponse?.expected_calving_date ?? saveResponse?.expectedCalvingDate ?? null,
        status: saveResponse?.status ?? initialData.status ?? 'Pending',
      });

      let certificateUploaded = false;
      if (certificateFile && savedLog.id) {
        try {
          const certificateResponse = await breedingApi.uploadCertificate(savedLog.id, certificateFile);
          savedLog = normalizeBreedingLog({ ...savedLog, ...certificateResponse });
          certificateUploaded = true;
        } catch (certificateError) {
          reportError(certificateError, { where: 'LogAIServiceForm.uploadCertificate' });
          toast.error(copy.certificateUploadFailed);
        }
      }

      if (!savedLog.semenSource) {
        savedLog.semenSource = logForm.semenSource;
      }

      // Invalidate cache and notify success
      await queryClient.invalidateQueries({ queryKey: ['breeding', 'logs', tenantId, farmId] });

      const reminderSuffix = savedLog.pregnancyCheckDate ? copy.reminder(savedLog.pregnancyCheckDate) : '';
      const certificateSuffix = certificateUploaded ? copy.certificateUploaded : '';
      const successMsg = `${copy.saved(Boolean(editingLogId), formatCowIdentity({
        cowName: savedLog.cowName || resolvedCow.name,
        cowTag: resolvedCow.earTag,
      }))}${certificateSuffix}${reminderSuffix}`;
      onSuccess?.(savedLog, successMsg);
      if (!onSuccess) toast.success(successMsg);

      // Reset form
      setLogForm({
        cowId: '',
        aiDate: '',
        aiTime: '',
        sireCode: '',
        semenSource: 'farm_stock',
        milkVolumePta: '',
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
      reportError(error, { where: 'LogAIServiceForm.save' });
      const errorMsg = getApiErrorMessage(error, copy.saveFailed);
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
          <h4 className="text-sm font-bold uppercase tracking-widest text-brand">{copy.details}</h4>
        </div>

        {/* Cow Selection */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.cow}</label>
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
              placeholder={copy.cowPlaceholder}
              aria-invalid={!!formErrors.cowId}
              aria-expanded={isCowPickerOpen}
              aria-autocomplete="list"
            />
            <button
              type="button"
              onClick={() => setIsCowPickerOpen((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted transition-colors hover:text-brand"
              aria-label={copy.toggleHerd}
            >
              <ChevronDown size={16} />
            </button>

            {isCowPickerOpen && (
              <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-ink/10 bg-surface ">
                {filteredCowOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-ink-muted">{copy.noHerdMatches}</div>
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
                      <span className="truncate text-xs text-ink-muted">{option.name || copy.noName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {herdOptions.length > 0 && (
            <p className="mt-1 text-[11px] text-ink-muted">{copy.herdHint}</p>
          )}
          {formErrors.cowId && <p className="mt-1 text-xs text-rose-600">{formErrors.cowId}</p>}
        </div>

        {/* AI Date, Time & Sire Code */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.aiDate}</label>
            <input
              type="date"
              className="input-machined w-full"
              value={logForm.aiDate}
              onChange={(event) => setLogForm((current) => ({ ...current, aiDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.aiTime}</label>
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
            <Upload size={13} /> {copy.certificateImage}
          </label>
          <input
            type="file"
            accept="image/*"
            className="input-machined w-full text-sm"
            onChange={(event) => setCertificateFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-ink-muted">{copy.certificateHint}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.technician}</label>
            <input
              className="input-machined w-full"
              value={logForm.technician}
              onChange={(event) => setLogForm((current) => ({ ...current, technician: event.target.value }))}
              placeholder={copy.technicianPlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.sireCode}</label>
            <input
              className={`input-machined w-full ${formErrors.sireCode ? 'border-rose-300 bg-rose-50' : ''}`}
              value={logForm.sireCode}
              onChange={(event) => {
                setLogForm((current) => ({ ...current, sireCode: normalizeSemenCode(event.target.value) }));
                if (formErrors.sireCode) setFormErrors({ ...formErrors, sireCode: null });
              }}
              placeholder={copy.sireCodePlaceholder}
            />
            {formErrors.sireCode && <p className="mt-1 text-xs text-rose-600">{formErrors.sireCode}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.ownerName}</label>
            <input
              className="input-machined w-full"
              value={logForm.ownerName}
              onChange={(event) => setLogForm((current) => ({ ...current, ownerName: event.target.value }))}
              placeholder={copy.ownerNamePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.farmLocation}</label>
            <input
              className="input-machined w-full"
              value={logForm.farmLocation}
              onChange={(event) => setLogForm((current) => ({ ...current, farmLocation: event.target.value }))}
              placeholder={copy.farmLocationPlaceholder}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.certificateNumber}</label>
            <input
              className="input-machined w-full"
              value={logForm.certificateNumber}
              onChange={(event) => setLogForm((current) => ({ ...current, certificateNumber: event.target.value }))}
              placeholder={copy.certificateNumberPlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.serviceFee}</label>
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
            {copy.repeatService}
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.notes}</label>
          <textarea
            className="input-machined w-full min-h-[96px]"
            value={logForm.note}
            onChange={(event) => setLogForm((current) => ({ ...current, note: event.target.value }))}
            placeholder={copy.notesPlaceholder}
          />
        </div>

        {/* Semen Source */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-ink-muted">{copy.semenSource}</label>
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
              {breedingCopy.sources.farm_stock}
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
              {breedingCopy.sources.vet_provided}
            </label>
          </div>
          {formErrors.semenSource && <p className="mt-1 text-xs text-rose-600">{formErrors.semenSource}</p>}
        </div>

        {logForm.semenSource === 'vet_provided' && (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
              {copy.sirePta}
            </label>
            <input
              type="number"
              step="0.01"
              className="input-machined w-full"
              value={logForm.milkVolumePta}
              onChange={(event) => setLogForm((current) => ({ ...current, milkVolumePta: event.target.value }))}
              placeholder={copy.sirePtaPlaceholder}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-command px-4 py-2 text-sm"
        >
          {isSaving ? copy.saving : editingLogId ? copy.update : copy.save}
        </button>
      </div>
    </form>
  );
}
