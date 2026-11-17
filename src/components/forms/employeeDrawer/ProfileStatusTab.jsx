import { EMPLOYEE_ROLE_OPTIONS, formatKenyanPhoneInput } from '../../../lib/staffAccessForm';
import { staffCopy } from '../../../i18n/staff';

export default function ProfileStatusTab({ profileData, setProfileData, errors, setErrors, isOnLeave, onSubmit, onClose }) {
  const copy = staffCopy.drawer;
  const updateField = (field, value) => {
    setProfileData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <div className="space-y-6 py-1">
        <section>
          <div className="mb-4 border-b border-ink-100 pb-3">
            <h3 className="text-section-title text-ink-700">{copy.employment}</h3>
            <p className="mt-1 text-meta text-ink-500">{copy.employmentHint}</p>
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-field-label text-ink-500">
              {copy.fullName} <span className="text-danger">*</span></span>
          <input
            required
            autoComplete="name"
            value={profileData.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="input-machined w-full"
            aria-invalid={Boolean(errors.name)}
          />
              {errors.name && <span className="mt-1.5 block text-meta text-danger">{errors.name}</span>}
        </label>

            <label className="block">
              <span className="mb-2 block text-field-label text-ink-500">
              {copy.jobRole} <span className="text-danger">*</span></span>
              <select
            required
            value={profileData.role}
            onChange={(event) => updateField('role', event.target.value)}
            className="input-machined w-full"
            aria-invalid={Boolean(errors.role)}
              >
                {EMPLOYEE_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {errors.role && <span className="mt-1.5 block text-meta text-danger">{errors.role}</span>}
        </label>

            <label className="block">
              <span className="mb-2 block text-field-label text-ink-500">
              {copy.phone} <span className="text-danger">*</span></span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={profileData.phoneNumber}
                onChange={(event) => updateField('phoneNumber', formatKenyanPhoneInput(event.target.value))}
                placeholder={copy.phonePlaceholder}
                className="input-machined w-full tabular-nums"
                aria-invalid={Boolean(errors.phoneNumber)}
              />
              {errors.phoneNumber && <span className="mt-1.5 block text-meta text-danger">{errors.phoneNumber}</span>}
            </label>

            <label className="block">
              <span className="mb-2 block text-field-label text-ink-500">
              {copy.status}</span>
          <select
            value={profileData.status}
            onChange={(event) => updateField('status', event.target.value)}
            className="input-machined w-full"
          >
            {['ACTIVE', 'ON_LEAVE', 'OVERDUE', 'INACTIVE'].map((status) => <option key={status} value={status}>{staffCopy.statuses[status]}</option>)}
          </select>
        </label>
          </div>
        </section>

      {isOnLeave && (
          <section className="grid gap-4 rounded-md border border-ink-200 bg-ink-50 p-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-field-label text-gray-500">{copy.leaveType}</span>
            <select
              value={profileData.leaveType}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveType: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-control text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
              <option value="">{copy.selectLeaveType}</option>
              {['UNPAID', 'PAID', 'SICK', 'MATERNITY', 'COMPASSIONATE'].map((type) => <option key={type} value={type}>{staffCopy.leaveTypes[type]}</option>)}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-field-label text-gray-500">{copy.unpaidDays}</span>
            <input
              type="number"
              min="0"
              value={profileData.unpaidLeaveDaysThisMonth}
              onChange={(event) => setProfileData((current) => ({ ...current, unpaidLeaveDaysThisMonth: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-control text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-field-label text-gray-500">{copy.leaveStart}</span>
            <input
              type="date"
              value={profileData.leaveStartDate}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveStartDate: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-control text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-field-label text-gray-500">{copy.expectedReturn}</span>
            <input
              type="date"
              value={profileData.leaveEndDate}
              onChange={(event) => setProfileData((current) => ({ ...current, leaveEndDate: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-control text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
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

          {copy.cancel}
        </button>
        <button
          type="submit"
          className="btn-command inline-flex min-w-36 items-center justify-center"
        >

          {copy.saveProfile}
        </button>
      </div>
    </form>
  );
}