export function normalizeMilkDropReport(report, index = 0) {
  return {
    ...report,
    id: report.id ?? report.alert_id ?? report.alertId ?? `alert-${index}`,
    date_time: report.date_time ?? report.createdAt ?? report.created_at ?? report.date ?? new Date().toISOString(),
    cow_id: report.cow_id ?? report.cowId ?? null,
    cow_tag: report.cow_tag ?? report.cowTag ?? report.tag_number ?? report.tagNumber ?? 'Unknown',
    cow_name: report.cow_name ?? report.cowName ?? report.animal_name ?? report.animalName ?? '',
    missing_milk: Number(report.missing_milk ?? report.missingMilk ?? report.delta_liters ?? report.deltaLiters ?? 0),
    status: String(report.status ?? 'OPEN').toUpperCase(),
    selected_reasons: report.selected_reasons ?? report.selectedReasons ?? [],
    investigation_notes: report.investigation_notes ?? report.investigationNotes ?? '',
  };
}