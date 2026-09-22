import { BadgeCheck, BriefcaseBusiness, Phone, Save, User, X } from 'lucide-react';
import { EMPLOYEE_ROLE_OPTIONS, formatKenyanPhoneInput } from '../../../lib/staffAccessForm';

export default function ProfileStatusTab({ profileData, setProfileData, errors, setErrors, isOnLeave, onSubmit, onClose }) {
  const updateField = (field, value) => {
    setProfileData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <div className="space-y-6 py-1">
        <section>
          <div className="mb-4 border-b border-ink-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-ink-700">Employment details</h3>
            <p className="mt-1 text-xs text-ink-500">Keep the employee’s staff register and contact information current.</p>
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-500"><User size={13} /> Full name <span className="text-danger">*</span></span>
          <input
            required
            autoComplete="name"
            value={profileData.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="input-machined w-full"
            aria-invalid={Boolean(errors.name)}
          />
              {errors.name && <span className="mt-1.5 block text-xs text-danger">{errors.name}</span>}
        </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-500"><BriefcaseBusiness size={13} /> Job role <span className="text-danger">*</span></span>
              <select
            required
            value={profileData.role}
            onChange={(event) => updateField('role', event.target.value)}
            className="input-machined w-full"
            aria-invalid={Boolean(errors.role)}
              >
                {EMPLOYEE_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {errors.role && <span className="mt-1.5 block text-xs text-danger">{errors.role}</span>}
        </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-500"><Phone size={13} /> Phone number <span className="text-danger">*</span></span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={profileData.phoneNumber}
                onChange={(event) => updateField('phoneNumber', formatKenyanPhoneInput(event.target.value))}
                placeholder="e.g. 0712 345 678"
                className="input-machined w-full tabular-nums"
                aria-invalid={Boolean(errors.phoneNumber)}
              />
              {errors.phoneNumber && <span className="mt-1.5 block text-xs text-danger">{errors.phoneNumber}</span>}
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-500"><BadgeCheck size={13} /> Employment status</span>
          <select
            value={profileData.status}
            onChange={(event) => updateField('status', event.target.value)}
            className="input-machined w-full"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
          </div>
        </section>

      {isOnLeave && (
          <section className="grid gap-4 rounded-md border border-ink-200 bg-ink-50 p-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Leave type</span>
            <select
              value={profileData.leaveType}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveType: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="">Select leave type</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="SICK">SICK</option>
              <option value="MATERNITY">MATERNITY</option>
              <option value="COMPASSIONATE">COMPASSIONATE</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Unpaid leave days this month</span>
            <input
              type="number"
              min="0"
              value={profileData.unpaidLeaveDaysThisMonth}
              onChange={(event) => setProfileData((current) => ({ ...current, unpaidLeaveDaysThisMonth: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Leave start</span>
            <input
              type="date"
              value={profileData.leaveStartDate}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveStartDate: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Expected return date</span>
            <input
              type="date"
              value={profileData.leaveEndDate}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveEndDate: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          </section>
      )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-ink-200 bg-ink-50 px-4 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary min-w-28"
        >
          <X size={14} className="mr-1 inline" /> Cancel
        </button>
        <button
          type="submit"
          className="btn-command inline-flex min-w-36 items-center justify-center gap-2"
        >
          <Save size={14} /> Save profile
        </button>
      </div>
    </form>
  );
}