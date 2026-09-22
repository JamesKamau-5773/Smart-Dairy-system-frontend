import { useState } from 'react';
import {
  BadgeDollarSign,
  User,
  HeartPulse,
} from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import ProfileStatusTab from './employeeDrawer/ProfileStatusTab';
import FinancialsTab from './employeeDrawer/FinancialsTab';
import MedicalCertificationsTab from './employeeDrawer/MedicalCertificationsTab';
import { formatKenyanPhoneInput, normalizeEmployeeRole, normalizeKenyanPhone } from '../../lib/staffAccessForm';

const tabs = [
  { id: 'profile', label: 'Profile & Status', icon: User },
  { id: 'financials', label: 'Financials', icon: BadgeDollarSign },
  { id: 'medical', label: 'Medical / Certifications', icon: HeartPulse },
];

function toNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function createProfileData(staff) {
  return {
    name: staff.name ?? '',
    role: normalizeEmployeeRole(staff.role),
    phoneNumber: formatKenyanPhoneInput(staff.phoneNumber ?? ''),
    status: staff.status ?? 'ACTIVE',
    leaveType: staff.leaveType ?? '',
    leaveStartDate: toDateInput(staff.leaveStartDate),
    leaveEndDate: toDateInput(staff.leaveEndDate),
    unpaidLeaveDaysThisMonth: staff.unpaidLeaveDaysThisMonth ?? 0,
  };
}

export default function EmployeeDrawer({
  isOpen,
  staff,
  onClose,
  onSaveProfile,
  onSaveFinancials,
  onSaveMedical,
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(() => createProfileData(staff));
  const [profileErrors, setProfileErrors] = useState({});
  const [financialData, setFinancialData] = useState({
    baseSalary: staff.baseSalary ?? 0,
    monthlyDeduction: staff.monthlyDeduction ?? 0,
    advanceAmount: 0,
    loanBalance: staff.loanBalance ?? 0,
  });
  const [medicalData, setMedicalData] = useState({
    certificationsText: Array.isArray(staff.medicalCertifications) ? staff.medicalCertifications.join(', ') : '',
    notes: staff.medicalNotes ?? '',
  });

  const isOnLeave = profileData.status === 'ON_LEAVE';

  if (!staff) {
    return null;
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    const phoneNumber = normalizeKenyanPhone(profileData.phoneNumber);
    const errors = {};
    if (!profileData.name.trim()) errors.name = 'Enter the employee’s full name.';
    if (!profileData.role) errors.role = 'Select a job role.';
    if (!phoneNumber) errors.phoneNumber = 'Enter a valid Kenyan mobile number, for example 0712 345 678.';
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }

    onSaveProfile(staff.id, {
      ...profileData,
      name: profileData.name.trim(),
      phoneNumber,
      leaveType: isOnLeave ? profileData.leaveType : '',
      leaveStartDate: isOnLeave ? profileData.leaveStartDate || null : null,
      leaveEndDate: isOnLeave ? profileData.leaveEndDate || null : null,
      unpaidLeaveDaysThisMonth: isOnLeave ? toNumber(profileData.unpaidLeaveDaysThisMonth) : 0,
    });
  };

  const handleFinancialSubmit = (event) => {
    event.preventDefault();

    onSaveFinancials(staff.id, {
      baseSalary: toNumber(financialData.baseSalary),
      monthlyDeduction: toNumber(financialData.monthlyDeduction),
      advanceAmount: toNumber(financialData.advanceAmount),
      loanBalance: toNumber(financialData.loanBalance),
    });
  };

  const handleMedicalSubmit = (event) => {
    event.preventDefault();

    onSaveMedical(staff.id, {
      medicalCertifications: medicalData.certificationsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      medicalNotes: medicalData.notes,
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={staff.name}
      subtitle="Manage profile, payroll inputs, and credentials without leaving the registry context."
    >
      <div className="space-y-5 text-gray-900">
        <div className="flex gap-4 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'profile' && (
          <ProfileStatusTab
            profileData={profileData}
            setProfileData={setProfileData}
            errors={profileErrors}
            setErrors={setProfileErrors}
            isOnLeave={isOnLeave}
            onSubmit={handleProfileSubmit}
            onClose={onClose}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialsTab
            financialData={financialData}
            setFinancialData={setFinancialData}
            onSubmit={handleFinancialSubmit}
            onClose={onClose}
          />
        )}

        {activeTab === 'medical' && (
          <MedicalCertificationsTab
            medicalData={medicalData}
            setMedicalData={setMedicalData}
            onSubmit={handleMedicalSubmit}
            onClose={onClose}
          />
        )}
      </div>
    </BaseModal>
  );
}
