import { formatMonth } from './dateFormat';

// Historical Checks: turning the backend's breeding logs into what the modal lists.
// Display labels and grouping only. Dates, notes and statuses are the backend's own, and
// nothing is filled in when they are missing.

/** Display label for each normalized backend status. */
export const OUTCOME_LABELS = Object.freeze({
  Pregnant: 'Pregnant (In-Calf)',
  Open: 'Open (Not Pregnant)',
  Failed: 'Unsuccessful',
  Pending: 'Pending Check',
});

/** The status filter chips, by backend status. */
export const HISTORY_FILTERS = Object.freeze([
  { value: 'All', label: 'All' },
  { value: 'Pregnant', label: 'Pregnant' },
  { value: 'Open', label: 'Open' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Failed', label: 'Unsuccessful' },
]);

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

/** "Jan 2026", or "No AI date" for the group of records without one. */
export function historyMonthLabel(key) {
  return key === NO_AI_DATE_GROUP ? 'No AI date' : formatMonth(key) ?? key;
}

/** How many filter controls are in use (search text, a status other than All). */
export function activeHistoryFilterCount(filter, search) {
  return [search.trim() !== '', filter !== 'All'].filter(Boolean).length;
}
