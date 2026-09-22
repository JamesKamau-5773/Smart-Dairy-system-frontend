import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, DollarSign, Search, Edit2, UserX, UserCheck, KeyRound } from 'lucide-react';
import AddEmployeeModal from '../../components/forms/AddEmployeeModal';
import EmployeeAccountInviteModal from '../../components/forms/EmployeeAccountInviteModal';
import EmployeeDrawer from '../../components/forms/EmployeeDrawer';
import VerifyReturnModal from '../../components/forms/VerifyReturnModal';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { useStaff } from '../../providers/StaffProvider';
import { useTenant } from '../../hooks/useTenant';
import { hrApi } from '../../lib/backendApi';
import { FARM_STAFF_ROLE_OPTIONS } from '../../lib/staffOnboarding';
import toast from 'react-hot-toast';

export default function StaffRegistry() {
  const { tenantId } = useTenant();
  const { staff, addEmployee, inviteEmployeeAccount, provisionEmployeeAccount, issueAdvance, editEmployee, verifyReturn, toggleEmployeeStatus } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [inviteStaffId, setInviteStaffId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedVerificationStaffId, setSelectedVerificationStaffId] = useState(null);
  const confirmation = useConfirmation();
  const staffingRecommendationQuery = useQuery({
    queryKey: ['staffing-recommendations', tenantId],
    queryFn: () => hrApi.getStaffingRecommendations(),
    enabled: Boolean(tenantId),
  });
  const staffingRecommendation = staffingRecommendationQuery.data;

  const selectedStaff = useMemo(
    () => staff.find((member) => member.id === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  );

  const selectedVerificationStaff = useMemo(
    () => staff.find((member) => member.id === selectedVerificationStaffId) ?? null,
    [staff, selectedVerificationStaffId]
  );

  const selectedInviteStaff = useMemo(
    () => staff.find((member) => member.id === inviteStaffId) ?? null,
    [staff, inviteStaffId]
  );

  const recommendedRoles = useMemo(() => Object.entries(staffingRecommendation?.recommended_roles ?? {})
    .filter(([, count]) => Number(count) > 0)
    .map(([role, count]) => ({
      role,
      count: Number(count),
      label: FARM_STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role,
    })), [staffingRecommendation]);

  const openDrawer = (staffMember) => {
    setSelectedStaffId(staffMember.id);
    setIsDrawerOpen(true);
  };

  const openVerifyModal = (staffMember) => {
    setSelectedVerificationStaffId(staffMember.id);
    setIsVerifyModalOpen(true);
  };

  const handleSaveProfile = (staffId, updatedData) => {
    return editEmployee(staffId, updatedData).catch(() => toast.error('Failed to update employee profile.'));
  };

  const handleSaveFinancials = (staffId, updatedData) => {
    const currentStaff = staff.find((member) => member.id === staffId);

    if (!currentStaff) {
      return;
    }

    return editEmployee(staffId, {
      baseSalary: updatedData.baseSalary,
      monthlyDeduction: updatedData.monthlyDeduction,
    }).then(() => {
      if (updatedData.advanceAmount > 0) {
        return issueAdvance(currentStaff, updatedData.advanceAmount, updatedData.monthlyDeduction);
      }
      return null;
    }).catch(() => toast.error('Failed to update employee financials.'));
  };

  const handleSaveMedical = (staffId, updatedData) => {
    return editEmployee(staffId, updatedData).catch(() => toast.error('Failed to update employee medical details.'));
  };

  const handleVerifyReturn = ({ returned, note }) => {
    if (!selectedVerificationStaff) {
      return;
    }

    verifyReturn(selectedVerificationStaff.id, returned, note)
      .then(() => {
        setIsVerifyModalOpen(false);
        setSelectedVerificationStaffId(null);
      })
      .catch(() => toast.error('Failed to verify staff return.'));
  };

  const handleToggleStatus = async (staffMember) => {
    const action = staffMember.status === 'ACTIVE' ? 'deactivate' : 'activate';
    const confirmed = await confirmation.confirm({
      title: `${action === 'deactivate' ? 'Deactivate' : 'Activate'} Staff Member`,
      message: `Are you sure you want to ${action} ${staffMember.name}?`,
      confirmText: action === 'deactivate' ? 'Deactivate' : 'Activate',
      type: action === 'deactivate' ? 'danger' : 'info',
    });
    if (!confirmed) return;
    if (action === 'deactivate' && staffMember.loanBalance > 0) {
      toast.error(`${staffMember.name} has an outstanding loan balance. Clear it before deactivating.`);
    } else {
      try {
        await toggleEmployeeStatus(staffMember.id);
        staffingRecommendationQuery.refetch();
      } catch {
        toast.error(`Failed to ${action} ${staffMember.name}.`);
      }
    }
  };

  const handleAddEmployee = async (employee, access) => {
    let createdEmployee;
    try {
      createdEmployee = await addEmployee(employee);
      staffingRecommendationQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to add employee.');
      throw error;
    }

    try {
      if (access?.mode === 'invite') {
        await inviteEmployeeAccount(createdEmployee.id, { role: access.role });
      } else if (access?.mode === 'provision') {
        await provisionEmployeeAccount(createdEmployee.id, {
          role: access.role,
          password: access.password,
          requires_password_reset: true,
        });
      }
      toast.success(access?.mode === 'none' ? 'Employee added successfully.' : 'Employee and app access created.');
      return createdEmployee;
    } catch (error) {
      toast.error('Employee saved, but app access failed. Retry from the key action.');
      const partialFailure = new Error('Employee created but access provisioning failed.', { cause: error });
      partialFailure.employeeCreated = true;
      throw partialFailure;
    }
  };

  const handleInviteEmployee = async (staffId, payload) => {
    const invitation = await inviteEmployeeAccount(staffId, payload);
    toast.success('Employee account invitation created.');
    return invitation;
  };

  const handleProvisionEmployee = async (staffId, payload) => {
    const provisioned = await provisionEmployeeAccount(staffId, payload);
    toast.success('Employee account provisioned.');
    return provisioned;
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
      <Confirmation {...confirmation} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="m-0 font-sans text-3xl font-black tracking-tight text-slate-800">Staff Registry</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage employee profiles, contracts, and salary advances.</p>
        </div>
        <button onClick={() => setIsAddEmployeeModalOpen(true)} className="flex items-center rounded-lg bg-brand px-5 py-2.5 text-xs font-black uppercase text-white transition-all hover:bg-brand-dark">
          <UserPlus size={14} /> Add employee
        </button>
      </div>

      <section className="mb-6 border-y border-slate-200 bg-slate-50 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {staffingRecommendation ? `${staffingRecommendation.employee_count} active employees` : 'Staffing guidance'}
          </p>
          <h3 className="mt-1 text-base font-bold capitalize text-slate-800">
            {staffingRecommendation ? `${String(staffingRecommendation.farm_size).toLowerCase().replaceAll('_', ' ')} farm` : 'Loading recommendations...'}
          </h3>
        </div>
        <div className="mt-3 max-w-2xl sm:mt-0 sm:text-right">
          {recommendedRoles.length > 0 && (
            <p className="text-sm font-semibold text-slate-700">
              Recommended: {recommendedRoles.map(({ label, count }) => `${count} ${label.toLowerCase()}${count === 1 ? '' : 's'}`).join(', ')}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {staffingRecommendation?.note || (staffingRecommendationQuery.isError ? 'Staffing recommendations are temporarily unavailable.' : 'Based on active employee count.')}
          </p>
        </div>
      </section>

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

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white ">
        <table className="min-w-[960px] w-full text-left">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-6 py-3">Employee</th>
              <th className="px-6 py-3">Base Salary (KES)</th>
              <th className="px-6 py-3">Outstanding Loan (KES)</th>
              <th className="px-6 py-3">App Access</th>
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
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      staffMember.accountStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ['INVITED', 'INVITE_PENDING'].includes(staffMember.accountStatus)
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {staffMember.accountStatus === 'ACTIVE' ? 'ACTIVE' : ['INVITED', 'INVITE_PENDING'].includes(staffMember.accountStatus) ? 'INVITE PENDING' : 'NO ACCOUNT'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[displayStatus] || statusClasses.INACTIVE}`}>
                      {displayStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setInviteStaffId(staffMember.id)}
                        disabled={staffMember.accountStatus === 'ACTIVE'}
                        className="p-2 text-slate-400 transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                        title={staffMember.accountStatus === 'ACTIVE' ? 'Account is active' : ['INVITED', 'INVITE_PENDING'].includes(staffMember.accountStatus) ? 'Manage pending invitation' : 'Manage app access'}
                        aria-label={staffMember.accountStatus === 'ACTIVE' ? `Account active for ${staffMember.name}` : `Invite ${staffMember.name} to the app`}
                      >
                        <KeyRound size={14} />
                      </button>
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

      {isAddEmployeeModalOpen && (
        <AddEmployeeModal
          isOpen
          onClose={() => setIsAddEmployeeModalOpen(false)}
          onSave={handleAddEmployee}
        />
      )}

      {selectedInviteStaff && (
        <EmployeeAccountInviteModal
          isOpen
          staff={selectedInviteStaff}
          onClose={() => setInviteStaffId(null)}
          onInvite={handleInviteEmployee}
          onProvision={handleProvisionEmployee}
        />
      )}

      {isDrawerOpen && selectedStaff && (
        <EmployeeDrawer
          isOpen
          onClose={() => setIsDrawerOpen(false)}
          staff={selectedStaff}
          onSaveProfile={handleSaveProfile}
          onSaveFinancials={handleSaveFinancials}
          onSaveMedical={handleSaveMedical}
        />
      )}

      <VerifyReturnModal
        isOpen={isVerifyModalOpen}
        staff={selectedVerificationStaff}
        onClose={() => setIsVerifyModalOpen(false)}
        onConfirm={handleVerifyReturn}
      />
    </div>
  );
}
