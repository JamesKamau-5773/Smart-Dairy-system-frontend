import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  User,
  BadgeCheck,
  HeartPulse,
} from 'lucide-react';
import SlidePanel from '../ui/SlidePanel';
import ProfileStatusTab from './employeeDrawer/ProfileStatusTab';
import FinancialsTab from './employeeDrawer/FinancialsTab';
import MedicalCertificationsTab from './employeeDrawer/MedicalCertificationsTab';

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

export default function EmployeeDrawer({
  isOpen,
  staff,
  onClose,
  onSaveProfile,
  onSaveFinancials,
  onSaveMedical,
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    role: '',
    status: 'ACTIVE',
    leaveType: '',
    leaveStartDate: '',
    leaveEndDate: '',
    unpaidLeaveDaysThisMonth: 0,
  });
  const [financialData, setFinancialData] = useState({
    baseSalary: 0,
    monthlyDeduction: 0,
    advanceAmount: 0,
    loanBalance: 0,
  });
  const [medicalData, setMedicalData] = useState({
    certificationsText: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen || !staff) {
      return;
    }

    setActiveTab('profile');
    setProfileData({
      name: staff.name ?? '',
      role: staff.role ?? '',
      status: staff.status ?? 'ACTIVE',
      leaveType: staff.leaveType ?? '',
      leaveStartDate: toDateInput(staff.leaveStartDate),
      leaveEndDate: toDateInput(staff.leaveEndDate),
      unpaidLeaveDaysThisMonth: staff.unpaidLeaveDaysThisMonth ?? 0,
    });
    setFinancialData({
      baseSalary: staff.baseSalary ?? 0,
      monthlyDeduction: staff.monthlyDeduction ?? 0,
      advanceAmount: 0,
      loanBalance: staff.loanBalance ?? 0,
    });
    setMedicalData({
      certificationsText: Array.isArray(staff.medicalCertifications) ? staff.medicalCertifications.join(', ') : '',
      notes: staff.medicalNotes ?? '',
    });
  }, [isOpen, staff]);

  const isOnLeave = profileData.status === 'ON_LEAVE';

  const statusTone = useMemo(() => {
    switch (profileData.status) {
      case 'OVERDUE':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      case 'ON_LEAVE':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
      default:
        return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    }
  }, [profileData.status]);

  if (!staff) {
    return null;
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    onSaveProfile(staff.id, {
      ...profileData,
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
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={staff.name}
      headerMeta={(
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-500">{staff.role}</span>
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
            {profileData.status}
          </span>
        </div>
      )}
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
    </SlidePanel>
  );
}