import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Save, BriefcaseBusiness, WalletCards, Phone, CalendarDays, KeyRound, AlertTriangle } from 'lucide-react';
import AccessProvisioningFields from './AccessProvisioningFields';
import {
  ACCESS_MODES,
  EMPLOYEE_ROLE_OPTIONS,
  formatKenyanPhoneInput,
  formatSalaryInput,
  normalizeKenyanPhone,
  parseSalaryInput,
  validateEmployeeFields,
  validateProvisioningFields,
} from '../../lib/staffAccessForm';

const INITIAL_STATE = {
  name: '',
  role: 'FARM_HAND',
  phoneNumber: '',
  baseSalary: '',
  hireDate: new Date().toISOString().slice(0, 10),
};

export default function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [accessMode, setAccessMode] = useState(ACCESS_MODES.NONE);
  const [accessRole, setAccessRole] = useState('FARM_HAND');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [partialFailureMessage, setPartialFailureMessage] = useState('');
  const [employeeCreated, setEmployeeCreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'phoneNumber'
      ? formatKenyanPhoneInput(value)
      : name === 'baseSalary'
        ? formatSalaryInput(value)
        : value;
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    setErrors((current) => ({ ...current, [name]: undefined }));
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
      employeeErrors.phoneNumber = 'A valid Kenyan mobile number is required for app access.';
    }
    const nextErrors = { ...employeeErrors, ...provisioningErrors };
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...formData,
        phoneNumber: normalizeKenyanPhone(formData.phoneNumber),
        baseSalary: parseSalaryInput(formData.baseSalary),
      }, {
        mode: accessMode,
        role: accessRole,
        password: temporaryPassword,
        requires_password_reset: true,
      });
      setTemporaryPassword('');
      onClose();
    } catch (error) {
      if (error?.employeeCreated) {
        setEmployeeCreated(true);
        setTemporaryPassword('');
        setPartialFailureMessage('The employee profile was saved, but app access could not be created. Close this form and retry from the key action in the employee row.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-slate-950/50 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-employee-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><UserPlus size={18} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">People & payroll</p>
              <h2 id="add-employee-title" className="mt-1 text-xl font-black tracking-tight text-slate-900">Add employee</h2>
              <p className="mt-1 text-sm text-slate-500">Create the employee's HR and payroll profile.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close add employee dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"><X size={19} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="space-y-6 overflow-y-auto px-6 py-6 sm:px-7">
            <section>
              <div className="mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Employment details</h3>
                <p className="mt-1 text-xs text-slate-500">Basic information used in the staff register and payroll.</p>
              </div>

              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><UserPlus size={13} /> Full name <span className="text-danger">*</span></span>
                  <input required autoFocus autoComplete="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mary Wanjiku" className="input-machined w-full" aria-invalid={Boolean(errors.name)} />
                  {errors.name && <span className="mt-1.5 block text-xs text-danger">{errors.name}</span>}
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><BriefcaseBusiness size={13} /> Job role <span className="text-danger">*</span></span>
                  <select required name="role" value={formData.role} onChange={handleChange} className="input-machined w-full">
                    {EMPLOYEE_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.role && <span className="mt-1.5 block text-xs text-danger">{errors.role}</span>}
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Phone size={13} /> Phone number <span className="text-danger">*</span></span>
                  <input required name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" value={formData.phoneNumber} onChange={handleChange} placeholder="e.g. 0712 345 678" className="input-machined w-full tabular-nums" aria-invalid={Boolean(errors.phoneNumber)} />
                  {errors.phoneNumber && <span className="mt-1.5 block text-xs text-danger">{errors.phoneNumber}</span>}
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><WalletCards size={13} /> Base salary (KES) <span className="text-danger">*</span></span>
                  <input required name="baseSalary" type="text" inputMode="numeric" value={formData.baseSalary} onChange={handleChange} placeholder="e.g. 35,000" className="input-machined w-full tabular-nums" aria-invalid={Boolean(errors.baseSalary)} />
                  {errors.baseSalary && <span className="mt-1.5 block text-xs text-danger">{errors.baseSalary}</span>}
                </label>
                <label className="block sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><CalendarDays size={13} /> Hire date <span className="text-danger">*</span></span>
                  <input required name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} className="input-machined w-full" />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-3">
                <KeyRound size={17} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">App access</h3>
                  <p className="mt-1 text-xs text-slate-500">Choose whether this employee needs a linked account now.</p>
                </div>
              </div>
              <AccessProvisioningFields
                mode={accessMode}
                onModeChange={(mode) => { setAccessMode(mode); setErrors({}); }}
                role={accessRole}
                onRoleChange={setAccessRole}
                phoneNumber={formData.phoneNumber}
                password={temporaryPassword}
                onPasswordChange={setTemporaryPassword}
                errors={errors}
                allowNoAccess
              />
            </section>

            {partialFailureMessage && (
              <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <span>{partialFailureMessage}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary min-w-28">{employeeCreated ? 'Close' : 'Cancel'}</button>
            {!employeeCreated && <button type="submit" disabled={isSaving} className="btn-command inline-flex min-w-40 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} /> {isSaving ? 'Saving employee...' : accessMode === ACCESS_MODES.NONE ? 'Save employee' : 'Save and grant access'}
            </button>}
          </div>
        </form>
        </div>
      </div>
    </div>,
    document.body
  );
}