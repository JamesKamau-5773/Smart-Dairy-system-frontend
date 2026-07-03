import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { hrApi, normalizeStaffRecord } from '../lib/backendApi';

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

    try {
      const created = await hrApi.createStaff(payload);
      return mergeStaffRecord(created);
    } catch (error) {
      console.warn('Falling back to local staff creation.', error);

      return mergeStaffRecord({
        id: `staff_${Date.now()}`,
        ...payload,
        loanBalance: 0,
        monthlyDeduction: 0,
        status: 'ACTIVE',
        leaveType: '',
        leaveStartDate: null,
        leaveEndDate: null,
        actualReturnDate: null,
        returnVerifiedAt: null,
        returnVerificationDecision: null,
        returnVerificationNote: '',
        unpaidLeaveDaysThisMonth: 0,
        medicalCertifications: [],
        medicalNotes: '',
      });
    }
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

    try {
      const saved = await hrApi.updateStaff(staffMember.id, {
        loanBalance: updatedStaff.loanBalance,
        monthlyDeduction: updatedStaff.monthlyDeduction,
      });
      return mergeStaffRecord(saved);
    } catch (error) {
      console.warn('Falling back to local loan update.', error);
      return mergeStaffRecord(updatedStaff);
    }
  };
  
  const editEmployee = async (staffId, updatedData) => {
    const payload = { ...updatedData };

    try {
      const saved = await hrApi.updateStaff(staffId, payload);
      return mergeStaffRecord(saved);
    } catch (error) {
      console.warn('Falling back to local staff update.', error);

      setStaffData((currentStaff) =>
        sortStaff(currentStaff.map((staff) =>
          staff.id === staffId
            ? {
                ...staff,
                ...payload,
                ...(payload.status === 'ON_LEAVE' || payload.status === 'OVERDUE'
                  ? {
                      actualReturnDate: null,
                      returnVerifiedAt: null,
                      returnVerificationDecision: null,
                    }
                  : {}),
              }
            : staff
        ))
      );
    }
  };

  const verifyReturn = async (staffId, returned, note = '') => {
    const timestamp = new Date().toISOString();
    const actualReturnDate = timestamp.slice(0, 10);

    try {
      const saved = await hrApi.verifyReturn(staffId, { returned, note });
      return mergeStaffRecord(saved);
    } catch (error) {
      console.warn('Falling back to local return verification.', error);

      setStaffData((currentStaff) =>
        sortStaff(currentStaff.map((staff) => {
          if (staff.id !== staffId) {
            return staff;
          }

          if (returned) {
            return {
              ...staff,
              status: 'ACTIVE',
              actualReturnDate,
              returnVerifiedAt: timestamp,
              returnVerificationDecision: 'YES',
              returnVerificationNote: note,
            };
          }

          return {
            ...staff,
            status: 'OVERDUE',
            actualReturnDate: null,
            returnVerifiedAt: timestamp,
            returnVerificationDecision: 'NO',
            returnVerificationNote: note,
          };
        }))
      );
    }
  };

  const toggleEmployeeStatus = async (staffId) => {
    const currentStaff = staffData.find((staff) => staff.id === staffId);

    if (!currentStaff) {
      return;
    }

    const nextStatus = currentStaff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const saved = await hrApi.updateStaff(staffId, { status: nextStatus });
      return mergeStaffRecord(saved);
    } catch (error) {
      console.warn('Falling back to local status toggle.', error);
      setStaffData((current) => sortStaff(current.map((staff) => (staff.id === staffId ? { ...staff, status: nextStatus } : staff))));
    }
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

  const value = { staff: staffData, addEmployee, issueAdvance, editEmployee, verifyReturn, toggleEmployeeStatus, reduceLoanBalance, isHydrating };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}