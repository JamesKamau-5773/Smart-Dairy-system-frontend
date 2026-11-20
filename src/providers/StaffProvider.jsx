import { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { hrApi, normalizeStaffRecord, staffOnboardingApi } from '../lib/backendApi';
import { useAuth } from '../contexts/AuthContext';
import { hasPageAccess } from '../lib/roles';
import { todayLocalIso } from '../lib/localDate';

const sortStaff = (records) => [...records].sort((a, b) => a.name.localeCompare(b.name));

const StaffContext = createContext();

export function StaffProvider({ children }) {
  const { tenantId, activeFarm } = useTenant();
  const { currentUser } = useAuth();
  // Only the staff and payroll pages read this list. Loading it for everyone sent
  // a /hr/staff request (and a 403) on every page for staff without those pages.
  const canReadStaff = Boolean(currentUser) && (hasPageAccess(currentUser, 'staff') || hasPageAccess(currentUser, 'payroll'));
  const [staffData, setStaffData] = useState([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      if (!tenantId || !activeFarm?.id || !canReadStaff) {
        setStaffData([]);
        setIsHydrating(false);
        return;
      }

      setIsHydrating(true);

      try {
        const records = await hrApi.listStaff();

        if (cancelled) {
          return;
        }

        setStaffData(records.length ? sortStaff(records.map(normalizeStaffRecord)) : []);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load staff records.', error);
          setStaffData([]);
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [tenantId, activeFarm?.id, canReadStaff]);

  const mergeStaffRecord = (record) => {
    const normalized = normalizeStaffRecord(record);

    setStaffData((currentStaff) => {
      const next = currentStaff.some((staff) => staff.id === normalized.id)
        ? currentStaff.map((staff) => (staff.id === normalized.id ? { ...staff, ...normalized } : staff))
        : [normalized, ...currentStaff];

      return sortStaff(next);
    });

    return normalized;
  };

  const addEmployee = async (newEmployeeData) => {
    const payload = {
      ...newEmployeeData,
      baseSalary: Number(newEmployeeData.baseSalary || 0),
    };

    const created = await hrApi.createStaff(payload);
    return mergeStaffRecord(created);
  };

  const inviteEmployeeAccount = async (staffId, payload) => {
    const invitation = await staffOnboardingApi.invite({ employee_id: staffId, ...payload });
    const returnedEmployee = invitation?.employee ?? invitation?.staff;
    if (returnedEmployee) {
      mergeStaffRecord(returnedEmployee);
    } else {
      const records = await hrApi.listStaff();
      setStaffData(sortStaff(records.map(normalizeStaffRecord)));
    }

    return invitation;
  };

  const provisionEmployeeAccount = async (staffId, payload) => {
    const provisioned = await staffOnboardingApi.provision({ employee_id: staffId, ...payload });
    const returnedEmployee = provisioned?.employee ?? provisioned?.staff;
    if (returnedEmployee) {
      mergeStaffRecord(returnedEmployee);
    } else {
      const records = await hrApi.listStaff();
      setStaffData(sortStaff(records.map(normalizeStaffRecord)));
    }

    return provisioned;
  };

  const updateEmployeePageAccess = async (staffId, pageAccess) => {
    const saved = await hrApi.updateStaffPageAccess(staffId, pageAccess);
    const current = staffData.find((staff) => staff.id === staffId);
    if (current) mergeStaffRecord({ ...current, page_access: saved.page_access });
    return saved;
  };

  // The backend records the advance and returns the new balance; nothing is added up here.
  const issueAdvance = async (staffMember, amount) => {
    const result = await hrApi.issueAdvance(staffMember.id, { amount, date: todayLocalIso() });
    return mergeStaffRecord({ ...staffMember, loanBalance: result.loan_balance ?? staffMember.loanBalance });
  };

  const recordRepayment = async (staffMember, details) => {
    const result = await hrApi.recordAdvanceRepayment(staffMember.id, details);
    return mergeStaffRecord({ ...staffMember, loanBalance: result.loan_balance ?? staffMember.loanBalance });
  };

  const offboardEmployee = async (staffId, details) => mergeStaffRecord(await hrApi.offboardStaff(staffId, details));

  const deleteEmployee = async (staffId) => {
    await hrApi.deleteStaff(staffId);
    setStaffData((currentStaff) => currentStaff.filter((staff) => staff.id !== staffId));
  };

  const editEmployee = async (staffId, updatedData) => {
    const payload = { ...updatedData };

    const saved = await hrApi.updateStaff(staffId, payload);
    return mergeStaffRecord(saved);
  };

  const verifyReturn = async (staffId, returned, note = '') => {
    const saved = await hrApi.verifyReturn(staffId, { returned, note });
    return mergeStaffRecord(saved);
  };

  const toggleEmployeeStatus = async (staffId) => {
    const currentStaff = staffData.find((staff) => staff.id === staffId);

    if (!currentStaff) {
      return;
    }

    const nextStatus = currentStaff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const saved = await hrApi.updateStaff(staffId, { status: nextStatus });
    return mergeStaffRecord(saved);
  };

  const value = { staff: staffData, addEmployee, inviteEmployeeAccount, provisionEmployeeAccount, updateEmployeePageAccess, issueAdvance, recordRepayment, offboardEmployee, deleteEmployee, editEmployee, verifyReturn, toggleEmployeeStatus, isHydrating };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}
