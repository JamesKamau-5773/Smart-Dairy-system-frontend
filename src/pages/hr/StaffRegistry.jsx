import React, { useState, useMemo } from 'react';
import { UserPlus, DollarSign, Search, Edit2, UserX, UserCheck } from 'lucide-react';
import AddEmployeeModal from '../../components/forms/AddEmployeeModal';
import EmployeeDrawer from '../../components/forms/EmployeeDrawer';
import VerifyReturnModal from '../../components/forms/VerifyReturnModal';
import { useStaff } from '../../providers/StaffProvider';

export default function StaffRegistry() {
  const { staff, addEmployee, issueAdvance, editEmployee, verifyReturn, toggleEmployeeStatus } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedVerificationStaffId, setSelectedVerificationStaffId] = useState(null);

  const selectedStaff = useMemo(
    () => staff.find((member) => member.id === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  );

  const selectedVerificationStaff = useMemo(
    () => staff.find((member) => member.id === selectedVerificationStaffId) ?? null,
    [staff, selectedVerificationStaffId]
  );

  const openDrawer = (staffMember) => {
    setSelectedStaffId(staffMember.id);
    setIsDrawerOpen(true);
  };

  const openVerifyModal = (staffMember) => {
    setSelectedVerificationStaffId(staffMember.id);
    setIsVerifyModalOpen(true);
  };

  const handleSaveProfile = (staffId, updatedData) => {
    editEmployee(staffId, updatedData);
  };

  const handleSaveFinancials = (staffId, updatedData) => {
    const currentStaff = staff.find((member) => member.id === staffId);

    if (!currentStaff) {
      return;
    }

    editEmployee(staffId, {
      baseSalary: updatedData.baseSalary,
      monthlyDeduction: updatedData.monthlyDeduction,
    });

    if (updatedData.advanceAmount > 0) {
      issueAdvance(currentStaff, updatedData.advanceAmount, updatedData.monthlyDeduction);
    }
  };

  const handleSaveMedical = (staffId, updatedData) => {
    editEmployee(staffId, updatedData);
  };

  const handleVerifyReturn = ({ returned, note }) => {
    if (!selectedVerificationStaff) {
      return;
    }

    verifyReturn(selectedVerificationStaff.id, returned, note);
    setIsVerifyModalOpen(false);
    setSelectedVerificationStaffId(null);
  };

  const handleToggleStatus = (staffMember) => {
    const action = staffMember.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${staffMember.name}?`)) {
      if (action === 'deactivate' && staffMember.loanBalance > 0) {
        alert(`${staffMember.name} has an outstanding loan balance. Please clear it before deactivating.`);
      } else {
        toggleEmployeeStatus(staffMember.id);
      }
    }
  };

  const filteredStaff = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return staff;
    return staff.filter((member) =>
      member.name.toLowerCase().includes(term) ||
      member.role.toLowerCase().includes(term)
    );
  }, [staff, searchTerm]);

  const statusClasses = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    ON_LEAVE: 'bg-gray-200 text-gray-700',
    OVERDUE: 'bg-red-100 text-red-800',
    INACTIVE: 'bg-slate-200 text-slate-600',
  };

  return (
    <div className="animate-reveal p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="m-0 font-sans text-3xl font-black tracking-tight text-slate-800">Staff Registry</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage employee profiles, contracts, and salary advances.</p>
        </div>
        <button onClick={() => setIsAddEmployeeModalOpen(true)} className="flex items-center rounded-lg bg-brand px-5 py-2.5 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-brand-dark">
          <UserPlus size={14} className="mr-2" /> Add New Employee
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search for an employee by name or role..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-lg border border-slate-200 py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-brand/50"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-6 py-3">Employee</th>
              <th className="px-6 py-3">Base Salary (KSh)</th>
              <th className="px-6 py-3">Outstanding Loan (KSh)</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((staffMember) => {
              const displayStatus = staffMember.status ?? 'INACTIVE';

              return (
                <tr key={staffMember.id} className={`transition-colors hover:bg-slate-50/50 ${displayStatus !== 'ACTIVE' ? 'bg-slate-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-sm text-slate-800">{staffMember.name}</div>
                    <div className="text-xs text-slate-500">{staffMember.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{staffMember.baseSalary.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${staffMember.loanBalance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{staffMember.loanBalance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[displayStatus] || statusClasses.INACTIVE}`}>
                      {displayStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {staffMember.status === 'ACTIVE' ? (
                        <button onClick={() => handleToggleStatus(staffMember)} className="p-2 text-slate-400 transition-colors hover:text-danger" title="Deactivate Employee">
                          <UserX size={14} />
                        </button>
                      ) : (
                        <button onClick={() => handleToggleStatus(staffMember)} className="p-2 text-slate-400 transition-colors hover:text-brand" title="Activate Employee">
                          <UserCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => openDrawer(staffMember)} className="p-2 text-slate-400 transition-colors hover:text-ink" title="Edit Employee">
                        <Edit2 size={14} />
                      </button>
                      {displayStatus === 'OVERDUE' ? (
                        <button onClick={() => openVerifyModal(staffMember)} className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-red-700">
                          <UserCheck size={12} /> Verify Return
                        </button>
                      ) : (
                        <button onClick={() => openDrawer(staffMember)} disabled={displayStatus !== 'ACTIVE'} className="flex items-center gap-1.5 rounded-md bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-700 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                          <DollarSign size={12} /> Issue Advance
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSave={addEmployee}
      />

      <EmployeeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        staff={selectedStaff}
        onSaveProfile={handleSaveProfile}
        onSaveFinancials={handleSaveFinancials}
        onSaveMedical={handleSaveMedical}
      />

      <VerifyReturnModal
        isOpen={isVerifyModalOpen}
        staff={selectedVerificationStaff}
        onClose={() => setIsVerifyModalOpen(false)}
        onConfirm={handleVerifyReturn}
      />
    </div>
  );
}
