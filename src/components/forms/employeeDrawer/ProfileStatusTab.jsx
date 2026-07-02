import React from 'react';
import { X } from 'lucide-react';

export default function ProfileStatusTab({ profileData, setProfileData, isOnLeave, onSubmit, onClose }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Full name</span>
          <input
            value={profileData.name}
            onChange={(event) => setProfileData((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Role</span>
          <input
            value={profileData.role}
            onChange={(event) => setProfileData((current) => ({ ...current, role: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Employment status</span>
          <select
            value={profileData.status}
            onChange={(event) => setProfileData((current) => ({ ...current, status: event.target.value }))}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
      </div>

      {isOnLeave && (
        <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-2">
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
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:bg-gray-50"
        >
          <X size={14} className="mr-1 inline" /> Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-brand-dark"
        >
          Save profile
        </button>
      </div>
    </form>
  );
}