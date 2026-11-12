import { formatDate } from './dateFormat';
const firstDefined = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') ?? null;

/**
 * One milk drop alert as the page uses it. Fields the backend didn't send stay null (shown
 * as "—"); nothing is filled in with a guess such as today's date or 0 litres.
 */
export function normalizeMilkDropReport(report, index = 0) {
  const missingMilk = firstDefined(report.missing_milk, report.missingMilk, report.delta_liters, report.deltaLiters);
  return {
    ...report,
    id: report.id ?? report.alert_id ?? report.alertId ?? `alert-${index}`,
    date_time: firstDefined(report.date_time, report.createdAt, report.created_at, report.date),
    cow_id: report.cow_id ?? report.cowId ?? null,
    cow_tag: firstDefined(report.cow_tag, report.cowTag, report.tag_number, report.tagNumber),
    cow_name: report.cow_name ?? report.cowName ?? report.animal_name ?? report.animalName ?? '',
    missing_milk: missingMilk === null || !Number.isFinite(Number(missingMilk)) ? null : Number(missingMilk),
    status: String(report.status ?? 'OPEN').toUpperCase(),
    selected_reasons: report.selected_reasons ?? report.selectedReasons ?? [],
    investigation_notes: report.investigation_notes ?? report.investigationNotes ?? '',
  };
}

/** The alert's date in the phone's format; "—" when the backend sent none. */
export function formatAlertDate(value) {
  // The app's day-first date in the chosen language, not the phone's own format.
  return formatDate(value, '—');
}
