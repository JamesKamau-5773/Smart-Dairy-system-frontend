const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInCalendarDays(laterDate, earlierDate) {
  return Math.floor((toDateOnly(laterDate) - toDateOnly(earlierDate)) / MS_PER_DAY);
}

export function getOperationalStatus(staffMember, referenceDate = new Date()) {
  const currentStatus = staffMember?.status || 'ACTIVE';

  if (currentStatus === 'ACTIVE' || currentStatus === 'INACTIVE' || currentStatus === 'OVERDUE') {
    return currentStatus;
  }

  if (currentStatus === 'ON_LEAVE') {
    const expectedReturnDate = toDateOnly(staffMember?.leaveEndDate);
    if (expectedReturnDate && differenceInCalendarDays(referenceDate, expectedReturnDate) > 0) {
      return 'OVERDUE';
    }

    return 'ON_LEAVE';
  }

  return currentStatus;
}

export function getApprovedLeaveDays(staffMember) {
  return Number(staffMember?.unpaidLeaveDaysThisMonth || 0);
}

export function getOverduePenaltyDays(staffMember, referenceDate = new Date()) {
  const expectedReturnDate = toDateOnly(staffMember?.leaveEndDate);

  if (!expectedReturnDate) {
    return 0;
  }

  const actualReturnDate = toDateOnly(staffMember?.actualReturnDate);
  const cutoffDate = actualReturnDate && actualReturnDate > expectedReturnDate ? actualReturnDate : toDateOnly(referenceDate);

  if (!cutoffDate) {
    return 0;
  }

  return Math.max(0, differenceInCalendarDays(cutoffDate, expectedReturnDate));
}

export function getTotalLeaveDays(staffMember, referenceDate = new Date()) {
  return getApprovedLeaveDays(staffMember) + getOverduePenaltyDays(staffMember, referenceDate);
}
