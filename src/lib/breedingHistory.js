import { formatMonthYear } from './dateFormat';
import { breedingCopy } from '../i18n/breeding';

// Historical Checks: turning the backend's breeding logs into what the modal lists.
// Display labels and grouping only. Dates, notes and statuses are the backend's own, and
// nothing is filled in when they are missing. Labels are read when shown, in the chosen language.

/** Display label for a normalized backend status, e.g. "Pregnant (in-calf)". */
export function outcomeLabel(status) {
  return breedingCopy.outcomes[status] ?? breedingCopy.outcomes.Pending;
}

/** The status filter chips, by backend status. */
export function historyFilters() {
  return ['All', 'Pregnant', 'Open', 'Pending', 'Failed'].map((value) => ({
    value,
    label: value === 'All' ? breedingCopy.hub.all : breedingCopy.statuses[value],
  }));
}

export const NO_AI_DATE_GROUP = 'no-ai-date';

/**
 * Groups by the month of the AI service date (YYYY-MM-DD → YYYY-MM), keeping the order
 * given (the caller sorts newest first). Records without an AI date share one group.
 * @returns {Map<string, object[]>}
 */
export function groupHistoryByMonth(history) {
  const groups = new Map();
  history.forEach((entry) => {
    const key = /^\d{4}-\d{2}-\d{2}$/.test(entry.aiDate ?? '') ? entry.aiDate.slice(0, 7) : NO_AI_DATE_GROUP;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return groups;
}

/** "January 2026", or the "unknown month" label for the group of records without an AI date. */
export function historyMonthLabel(key) {
  const unknown = breedingCopy.hub.unknownMonth;
  return key === NO_AI_DATE_GROUP ? unknown : formatMonthYear(`${key}-01`, unknown);
}

/** How many filter controls are in use (search text, a status other than All). */
export function activeHistoryFilterCount(filter, search) {
  return [search.trim() !== '', filter !== 'All'].filter(Boolean).length;
}
