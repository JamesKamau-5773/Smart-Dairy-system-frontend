import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AccessProvisioningFields from './AccessProvisioningFields';
import BaseModal from '../ui/BaseModal';
import { FARM_STAFF_ROLE_OPTIONS, getDefaultStaffPageAccess, STAFF_PAGE_ACCESS_OPTIONS } from '../../lib/staffOnboarding';
import {
  ACCESS_MODES,
  formatKenyanPhoneInput,
  formatSalaryInput,
  normalizeKenyanPhone,
  parseSalaryInput,
  validateEmployeeFields,
  validateProvisioningFields,
} from '../../lib/staffAccessForm';
import { todayLocalIso } from '../../lib/localDate';
import StatutoryDeductionsToggle from './StatutoryDeductionsToggle';
import { useServerFieldErrors } from '../../hooks/useServerFieldErrors';
import FieldError from '../ui/FieldError';
import { fieldErrorProps } from '../ui/fieldErrorProps';
import { staffCopy } from '../../i18n/staff';

// The backend's employee fields, by this form's names, for showing its errors per input.
const SERVER_FIELDS = Object.freeze({
  fieldMap: { full_name: 'name', phone_number: 'phoneNumber', base_salary: 'baseSalary', hire_date: 'hireDate' },
});

const INITIAL_STATE = {
  name: '',
  role: 'FARM_HAND',
  phoneNumber: '',
  baseSalary: '',
  hireDate: todayLocalIso(),
  // The backend's default; the owner switches it off for staff it doesn't apply to.
  statutoryDeductionsEnabled: true,
};

export default function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const copy = staffCopy.addForm;
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [accessMode, setAccessMode] = useState(ACCESS_MODES.NONE);
  const [accessRole, setAccessRole] = useState('FARM_HAND');
  const [pageAccess, setPageAccess] = useState(getDefaultStaffPageAccess('FARM_HAND'));
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [partialFailureMessage, setPartialFailureMessage] = useState('');
  const [employeeCreated, setEmployeeCreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const server = useServerFieldErrors(saveError, SERVER_FIELDS);
  // This form's own checks first, then the backend's.
  const errorFor = (name) => errors[name] || server.errorFor(name);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'phoneNumber'
      ? formatKenyanPhoneInput(value)
      : name === 'baseSalary'
        ? formatSalaryInput(value)
        : value;
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    server.dismiss(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const employeeErrors = validateEmployeeFields(formData);
    const provisioningErrors = validateProvisioningFields({
      mode: accessMode,
      password: temporaryPassword,
      requiresPasswordReset: true,
    });
    if (accessMode !== ACCESS_MODES.NONE && !normalizeKenyanPhone(formData.phoneNumber)) {
      employeeErrors.phoneNumber = staffCopy.validation.phoneForAccess;
    }
    const nextErrors = { ...employeeErrors, ...provisioningErrors };
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave({
        ...formData,
        phoneNumber: normalizeKenyanPhone(formData.phoneNumber),
        baseSalary: parseSalaryInput(formData.baseSalary),
      }, {
        mode: accessMode,
        role: accessRole,
        page_access: pageAccess,
        password: temporaryPassword,
        requires_password_reset: true,
      });
      setTemporaryPassword('');
      onClose();
    } catch (error) {
      // The profile wasn't saved: show the backend's field errors under the inputs.
      if (!error?.employeeCreated) setSaveError(error);
      if (error?.employeeCreated) {
        setEmployeeCreated(true);
        setTemporaryPassword('');
        setPartialFailureMessage(copy.partialFailure);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      closeOnBackdrop
      dismissible={!isSaving}
      closeLabel={copy.close}
      onSubmit={handleSubmit}
      footerActions={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary min-w-28">{employeeCreated ? copy.closeButton : copy.cancel}</button>
          {!employeeCreated && <button type="submit" disabled={isSaving} className="btn-command inline-flex min-w-40 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? copy.saving : accessMode === ACCESS_MODES.NONE ? copy.save : copy.saveWithAccess}
          </button>}
        </>
      )}
    >
      <div className="space-y-6">
        <section>
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">{copy.employment}</h3>
            <p className="mt-1 text-xs text-slate-500">{copy.employmentHint}</p>
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
    {copy.fullName} <span className="text-danger">*</span></span>
              <input required autoFocus autoComplete="name" id="employee-name" name="name" value={formData.name} onChange={handleChange} placeholder={copy.namePlaceholder} className="input-machined w-full" {...fieldErrorProps('employee-name', errorFor('name'))} />
              <FieldError id="employee-name" message={errorFor('name')} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
    {copy.jobRole} <span className="text-danger">*</span></span>
              <select required id="employee-role" name="role" value={formData.role} onChange={handleChange} className="input-machined w-full" {...fieldErrorProps('employee-role', errorFor('role'))}>
                {FARM_STAFF_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <FieldError id="employee-role" message={errorFor('role')} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
    {copy.phone} <span className="text-danger">*</span></span>
              <input required id="employee-phone" name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" value={formData.phoneNumber} onChange={handleChange} placeholder={copy.phonePlaceholder} className="input-machined w-full tabular-nums" {...fieldErrorProps('employee-phone', errorFor('phoneNumber'))} />
              <FieldError id="employee-phone" message={errorFor('phoneNumber')} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
    {copy.salary} <span className="text-danger">*</span></span>
              <input required id="employee-salary" name="baseSalary" type="text" inputMode="numeric" value={formData.baseSalary} onChange={handleChange} placeholder={copy.salaryPlaceholder} className="input-machined w-full tabular-nums" {...fieldErrorProps('employee-salary', errorFor('baseSalary'))} />
              <FieldError id="employee-salary" message={errorFor('baseSalary')} />
            </label>
            <label className="block sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
    {copy.hireDate} <span className="text-danger">*</span></span>
              <input required id="employee-hire-date" name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} className="input-machined w-full" {...fieldErrorProps('employee-hire-date', errorFor('hireDate'))} />
              <FieldError id="employee-hire-date" message={errorFor('hireDate')} />
            </label>
            <StatutoryDeductionsToggle
              className="sm:col-span-2"
              checked={formData.statutoryDeductionsEnabled}
              onChange={(statutoryDeductionsEnabled) => setFormData((prev) => ({ ...prev, statutoryDeductionsEnabled }))}
            />
          </div>
        </section>

        <section>
          <div className="mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">{copy.appAccess}</h3>
              <p className="mt-1 text-xs text-slate-500">{copy.appAccessHint}</p>
            </div>
          </div>
          <AccessProvisioningFields
            mode={accessMode}
            onModeChange={(mode) => { setAccessMode(mode); setErrors({}); }}
            role={accessRole}
            onRoleChange={(nextRole) => { setAccessRole(nextRole); setPageAccess(getDefaultStaffPageAccess(nextRole)); }}
            phoneNumber={formData.phoneNumber}
            password={temporaryPassword}
            onPasswordChange={setTemporaryPassword}
            errors={errors}
            allowNoAccess
          />
          {accessMode !== ACCESS_MODES.NONE && (
            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-800">{copy.pages}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_PAGE_ACCESS_OPTIONS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={pageAccess.includes(key)} onChange={(event) => setPageAccess((current) => event.target.checked ? [...current, key] : current.filter((entry) => entry !== key))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {partialFailureMessage && (
          <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{partialFailureMessage}</span>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
