import { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { hrApi, normalizeStaffRecord, staffOnboardingApi } from '../lib/backendApi';

const sortStaff = (records) => [...records].sort((a, b) => a.name.localeCompare(b.name));

const StaffContext = createContext();

export function StaffProvider({ children }) {
  const { tenantId, activeFarm } = useTenant();
  const [staffData, setStaffData] = useState([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      if (!tenantId || !activeFarm?.id) {
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
  }, [tenantId, activeFarm?.id]);

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

  const issueAdvance = async (staffMember, amount, monthlyDeduction) => {
    const currentLoanBalance = Number(staffMember?.loanBalance || 0);
    const updatedStaff = {
      ...staffMember,
      loanBalance: currentLoanBalance + Number(amount || 0),
      monthlyDeduction: typeof monthlyDeduction === 'number'
        ? monthlyDeduction
        : staffMember?.monthlyDeduction || Math.max(0, Math.round(Number(amount || 0) / 3)),
    };

    const saved = await hrApi.updateStaff(staffMember.id, {
      loanBalance: updatedStaff.loanBalance,
      monthlyDeduction: updatedStaff.monthlyDeduction,
    });
    return mergeStaffRecord(saved);
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

  const reduceLoanBalance = (staffId, amount) => {
    setStaffData(currentStaff =>
      currentStaff.map(staff => {
        if (staff.id === staffId) {
          return { ...staff, loanBalance: Math.max(0, staff.loanBalance - amount) };
        }
        return staff;
      })
    );
  };

  const value = { staff: staffData, addEmployee, inviteEmployeeAccount, provisionEmployeeAccount, issueAdvance, editEmployee, verifyReturn, toggleEmployeeStatus, reduceLoanBalance, isHydrating };

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