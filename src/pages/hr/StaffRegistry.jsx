import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Edit2, KeyRound, MoreVertical, Search, Trash2, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import AddEmployeeModal from '../../components/forms/AddEmployeeModal';
import EmployeeAccountInviteModal from '../../components/forms/EmployeeAccountInviteModal';
import EmployeeDrawer from '../../components/forms/EmployeeDrawer';
import OffboardEmployeeModal from '../../components/forms/OffboardEmployeeModal';
import AdvanceRepaymentModal from '../../components/forms/AdvanceRepaymentModal';
import { getApiErrorBody, getApiErrorCode } from '../../lib/apiErrors';
import VerifyReturnModal from '../../components/forms/VerifyReturnModal';
import { Skeleton } from '../../components/ui';
import Confirmation, { useConfirmation } from '../../components/ui/Confirmation';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useStaff } from '../../providers/StaffProvider';
import { useTenant } from '../../hooks/useTenant';
import { getApiErrorMessage, hrApi } from '../../lib/backendApi';
import { accountLabel, hasAppAccount, roleLabel, staffStatus } from '../../lib/staffLabels';
import { tone } from '../../components/ui/tones';

const money = (value) => `KES ${Number(value || 0).toLocaleString()}`;

function StatusChip({ status }) {
  const { label, tone: toneName } = staffStatus(status);
  return <span className={`inline-flex rounded-badge px-2 py-0.5 text-xs font-semibold ${tone(toneName).chip}`}>{label}</span>;
}

export default function StaffRegistry() {
  const { tenantId } = useTenant();
  const {
    staff, isHydrating, addEmployee, inviteEmployeeAccount, provisionEmployeeAccount, updateEmployeePageAccess,
    issueAdvance, recordRepayment, offboardEmployee, deleteEmployee, editEmployee, verifyReturn,
  } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormer, setShowFormer] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  // { kind: 'access' | 'edit' | 'verify' | 'offboard', id } for the open dialog.
  const [dialog, setDialog] = useState(null);
  const confirmation = useConfirmation();

  const staffingRecommendationQuery = useQuery({
    queryKey: ['staffing-recommendations', tenantId],
    queryFn: () => hrApi.getStaffingRecommendations(),
    enabled: Boolean(tenantId),
  });
  const staffingRecommendation = staffingRecommendationQuery.data;

  const dialogStaff = useMemo(() => staff.find((member) => member.id === dialog?.id) ?? null, [staff, dialog]);
  const open = (kind, member) => setDialog({ kind, id: member.id });
  const close = () => setDialog(null);

  const recommendedRoles = useMemo(() => Object.entries(staffingRecommendation?.recommended_roles ?? {})
    .filter(([, count]) => Number(count) > 0)
    .map(([role, count]) => ({ count: Number(count), label: roleLabel(role) })), [staffingRecommendation]);

  // Every failure says what the server said, not a generic "Failed". The drawer
  // doesn't await its saves, so failures are reported here rather than rethrown.
  const fail = (fallback) => (error) => toast.error(getApiErrorMessage(error, fallback));

  const handleSaveProfile = (staffId, updatedData) => editEmployee(staffId, updatedData)
    .then(() => toast.success('Profile saved.'))
    .catch(fail('The profile was not saved.'));

  // Salary and an advance are two backend calls; say exactly which one didn't happen.
  // The advance is its own recorded movement (and a ledger expense on the backend).
  const handleSaveFinancials = async (staffId, updatedData) => {
    const member = staff.find((candidate) => candidate.id === staffId);
    if (!member) return;
    try {
      await editEmployee(staffId, {
        baseSalary: updatedData.baseSalary,
        monthlyDeduction: updatedData.monthlyDeduction,
        ...(typeof updatedData.statutoryDeductionsEnabled === 'boolean' ? { statutoryDeductionsEnabled: updatedData.statutoryDeductionsEnabled } : {}),
      });
    } catch (error) {
      fail('Salary details were not saved.')(error);
      return;
    }
    if (updatedData.advanceAmount > 0) {
      try {
        await issueAdvance(member, updatedData.advanceAmount);
      } catch (error) {
        fail('Salary details were saved, but the advance was not issued. Try issuing it again.')(error);
        return;
      }
    }
    toast.success(updatedData.advanceAmount > 0 ? 'Salary saved and advance issued.' : 'Salary details saved.');
    // Close so the advance field can't be submitted twice; the card shows the new balance.
    close();
  };

  const handleSaveMedical = (staffId, updatedData) => editEmployee(staffId, updatedData)
    .then(() => toast.success('Medical details saved.'))
    .catch(fail('Medical details were not saved.'));

  const handleVerifyReturn = ({ returned, note }) => {
    if (!dialogStaff) return;
    verifyReturn(dialogStaff.id, returned, note)
      .then(() => { toast.success('Return recorded.'); close(); })
      .catch((error) => toast.error(getApiErrorMessage(error, 'The return was not recorded.')));
  };

  // The backend keeps the history, checks the loan balance and disables any login.
  const handleOffboard = async (member, details) => {
    await offboardEmployee(member.id, details);
    staffingRecommendationQuery.refetch();
    toast.success(`${member.name} moved to former staff.`);
  };

  // For records added by mistake; the backend refuses anyone with payroll or advance history.
  const handleDelete = async (member) => {
    const confirmed = await confirmation.confirm({
      title: `Delete ${member.name}?`,
      message: 'Only for someone added by mistake. Anyone who has been paid or given an advance must be offboarded instead, to keep their records.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteEmployee(member.id);
      staffingRecommendationQuery.refetch();
      toast.success(`${member.name} deleted.`);
    } catch (error) {
      // Records with payroll, advances or ledger entries are kept; offer offboarding instead.
      if (getApiErrorCode(error) === 'HAS_HISTORY' && getApiErrorBody(error).can_offboard !== false) {
        const offboard = await confirmation.confirm({
          title: `${member.name} can’t be deleted`,
          message: `${member.name} has ${(getApiErrorBody(error).history ?? ['records']).join(' and ')} on record, which must be kept. Offboard them instead.`,
          confirmText: 'Offboard instead',
          type: 'warning',
        });
        if (offboard) open('offboard', member);
        return;
      }
      toast.error(getApiErrorMessage(error, `${member.name} was not deleted.`));
    }
  };

  const handleRehire = async (member) => {
    try {
      await editEmployee(member.id, { status: 'ACTIVE' });
      staffingRecommendationQuery.refetch();
      toast.success(`${member.name} is active again. Set their page access in Manage access.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `${member.name} was not reactivated.`));
    }
  };

  const handleAddEmployee = async (employee, access) => {
    let createdEmployee;
    try {
      createdEmployee = await addEmployee(employee);
      staffingRecommendationQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add this employee. Check the details and try again.'));
      throw error;
    }

    try {
      if (access?.mode === 'invite') {
        await inviteEmployeeAccount(createdEmployee.id, { role: access.role });
      } else if (access?.mode === 'provision') {
        await provisionEmployeeAccount(createdEmployee.id, { role: access.role, password: access.password, requires_password_reset: true });
      }
      toast.success(access?.mode === 'none' ? 'Employee added.' : 'Employee and app access created.');
      return createdEmployee;
    } catch (error) {
      toast.error(`Employee was saved, but app access was not created: ${getApiErrorMessage(error, 'try again from Manage access.')}`);
      const partialFailure = new Error('Employee created but access provisioning failed.', { cause: error });
      partialFailure.employeeCreated = true;
      throw partialFailure;
    }
  };

  const handleInviteEmployee = async (staffId, payload) => {
    const invitation = await inviteEmployeeAccount(staffId, payload);
    toast.success('Invitation created.');
    return invitation;
  };

  const handleProvisionEmployee = async (staffId, payload) => {
    const provisioned = await provisionEmployeeAccount(staffId, payload);
    toast.success('App account created.');
    return provisioned;
  };

  const handleSavePageAccess = async (staffId, pageAccess) => {
    await updateEmployeePageAccess(staffId, pageAccess);
    toast.success('Page access saved.');
  };

  const formerCount = staff.filter((member) => member.status === 'INACTIVE').length;
  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return staff.filter((member) => (showFormer || member.status !== 'INACTIVE')
      && (!term || [member.name, roleLabel(member.role), member.phoneNumber].join(' ').toLowerCase().includes(term)));
  }, [staff, searchTerm, showFormer]);

  // One list of actions for the desktop menu and the phone buttons.
  const actionsFor = (member) => {
    if (member.status === 'INACTIVE') {
      return [{ key: 'rehire', label: 'Make active again', Icon: UserCheck, onClick: () => handleRehire(member) }];
    }
    return [
      ...(member.status === 'OVERDUE' ? [{ key: 'verify', label: 'Verify return', Icon: UserCheck, onClick: () => open('verify', member), primary: true }] : []),
      { key: 'edit', label: 'Edit details', Icon: Edit2, onClick: () => open('edit', member) },
      { key: 'advance', label: 'Salary & advance', Icon: DollarSign, onClick: () => open('edit', member) },
      ...(member.loanBalance > 0 ? [{ key: 'repay', label: 'Record repayment', Icon: DollarSign, onClick: () => open('repay', member) }] : []),
      { key: 'access', label: hasAppAccount(member.accountStatus) ? 'Manage access' : 'Give app access', Icon: KeyRound, onClick: () => open('access', member) },
      { key: 'offboard', label: 'Offboard', Icon: UserMinus, onClick: () => open('offboard', member), danger: true },
      { key: 'delete', label: 'Delete (added by mistake)', Icon: Trash2, onClick: () => handleDelete(member), danger: true },
    ];
  };

  return (
    <div className="animate-reveal space-y-5 p-4 sm:p-8">
      <Confirmation {...confirmation} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">People</p>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Staff Registry</h1>
          <p className="mt-1 text-sm text-ink-muted">Employee details, salaries, advances and app access.</p>
        </div>
        <button type="button" onClick={() => setIsAddEmployeeModalOpen(true)} className="btn-command gap-2 self-start text-sm">
          <UserPlus size={16} aria-hidden="true" /> Add employee
        </button>
      </header>

      <section className="card-machined flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {staffingRecommendation ? `${staffingRecommendation.employee_count} active employees` : 'Staffing guidance'}
          </p>
          <p className="mt-0.5 text-base font-bold capitalize text-ink">
            {staffingRecommendation
              ? `${String(staffingRecommendation.farm_size).toLowerCase().replaceAll('_', ' ')} farm`
              : staffingRecommendationQuery.isError ? 'Not available right now' : 'Loading…'}
          </p>
        </div>
        <div className="max-w-2xl text-sm sm:text-right">
          {recommendedRoles.length > 0 && (
            <p className="font-semibold text-ink">
              Suggested team: {recommendedRoles.map(({ label, count }) => `${count} ${label.toLowerCase()}${count === 1 ? '' : 's'}`).join(', ')}
            </p>
          )}
          {staffingRecommendation?.note && <p className="mt-0.5 text-xs text-ink-muted">{staffingRecommendation.note}</p>}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search staff</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, role or phone"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="input-machined w-full pl-9 text-sm"
          />
        </label>
        {formerCount > 0 && (
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={showFormer} onChange={(event) => setShowFormer(event.target.checked)} className="h-4 w-4 accent-brand" />
            Show former staff ({formerCount})
          </label>
        )}
      </div>

      {isHydrating ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20 w-full" />)}</div>
      ) : staff.length === 0 ? (
        <section className="card-machined flex flex-col items-start gap-3 p-6">
          <p className="text-base font-bold text-ink">No employees yet</p>
          <p className="text-sm text-ink-muted">Add the people who work on the farm to pay them, track advances and give them app access.</p>
          <button type="button" onClick={() => setIsAddEmployeeModalOpen(true)} className="btn-command gap-2 text-sm"><UserPlus size={16} aria-hidden="true" /> Add your first employee</button>
        </section>
      ) : filteredStaff.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No employees match.{' '}
          <button type="button" onClick={() => { setSearchTerm(''); setShowFormer(true); }} className="font-semibold text-brand hover:underline">Clear search</button>
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-ink/10 bg-card md:block">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-ink/10 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Employee</th>
                  <th scope="col" className="px-5 py-3 text-right">Base salary</th>
                  <th scope="col" className="px-5 py-3 text-right">Owes in advances</th>
                  <th scope="col" className="px-5 py-3">App access</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filteredStaff.map((member) => {
                  const actions = actionsFor(member);
                  const primary = actions.find((action) => action.primary);
                  return (
                    <tr key={member.id} className={member.status === 'INACTIVE' ? 'text-ink-muted' : ''}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-ink">{member.name}</p>
                        <p className="text-xs text-ink-muted">{roleLabel(member.role)}{member.phoneNumber ? ` · ${member.phoneNumber}` : ''}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm tabular-nums">{money(member.baseSalary)}</td>
                      <td className={`px-5 py-3.5 text-right text-sm tabular-nums ${member.loanBalance > 0 ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{money(member.loanBalance)}</td>
                      <td className="px-5 py-3.5 text-sm">{accountLabel(member.accountStatus)}</td>
                      <td className="px-5 py-3.5"><StatusChip status={member.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {primary && (
                            <button type="button" onClick={primary.onClick} className="btn-command gap-1.5 px-3 text-xs">
                              <primary.Icon size={14} aria-hidden="true" /> {primary.label}
                            </button>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-ink/15 text-ink-muted hover:border-brand/40 hover:text-brand" aria-label={`Actions for ${member.name}`}>
                                <MoreVertical size={16} aria-hidden="true" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-52 p-1.5">
                              {actions.filter((action) => !action.primary).map(({ key, label, Icon, onClick, danger }) => (
                                <button key={key} type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${danger ? 'text-danger hover:bg-danger-50' : 'text-ink hover:bg-brand-50'}`}>
                                  <Icon size={14} aria-hidden="true" /> {label}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredStaff.map((member) => (
              <article key={member.id} className="rounded-card border border-ink/10 bg-card p-4" aria-label={member.name}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-ink">{member.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{roleLabel(member.role)}</p>
                  </div>
                  <StatusChip status={member.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-ink-muted">Base salary</dt><dd className="mt-0.5 font-semibold tabular-nums text-ink">{money(member.baseSalary)}</dd></div>
                  <div><dt className="text-ink-muted">Owes in advances</dt><dd className="mt-0.5 font-semibold tabular-nums text-ink">{money(member.loanBalance)}</dd></div>
                  <div className="col-span-2"><dt className="text-ink-muted">App access</dt><dd className="mt-0.5 font-semibold text-ink">{accountLabel(member.accountStatus)}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {actionsFor(member).map(({ key, label, onClick, danger, primary }) => (
                    <button key={key} type="button" onClick={onClick} className={`min-h-10 rounded-button px-3 text-xs font-semibold ${primary ? 'bg-brand text-white' : danger ? 'border border-danger/30 text-danger' : 'border border-ink/15 text-ink'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {isAddEmployeeModalOpen && (
        <AddEmployeeModal isOpen onClose={() => setIsAddEmployeeModalOpen(false)} onSave={handleAddEmployee} />
      )}
      {dialog?.kind === 'access' && dialogStaff && (
        <EmployeeAccountInviteModal isOpen staff={dialogStaff} onClose={close} onInvite={handleInviteEmployee} onProvision={handleProvisionEmployee} onSaveAccess={handleSavePageAccess} />
      )}
      {dialog?.kind === 'edit' && dialogStaff && (
        <EmployeeDrawer isOpen onClose={close} staff={dialogStaff} onSaveProfile={handleSaveProfile} onSaveFinancials={handleSaveFinancials} onSaveMedical={handleSaveMedical} />
      )}
      {dialog?.kind === 'repay' && dialogStaff && (
        <AdvanceRepaymentModal
          staff={dialogStaff}
          onClose={close}
          onSubmit={async (member, details) => {
            await recordRepayment(member, details);
            toast.success(`Repayment of KES ${Number(details.amount).toLocaleString()} recorded.`);
          }}
        />
      )}
      {dialog?.kind === 'offboard' && dialogStaff && (
        <OffboardEmployeeModal staff={dialogStaff} onClose={close} onSubmit={handleOffboard} />
      )}
      <VerifyReturnModal isOpen={dialog?.kind === 'verify'} staff={dialogStaff} onClose={close} onConfirm={handleVerifyReturn} />
    </div>
  );
}
