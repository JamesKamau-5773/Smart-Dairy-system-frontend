import { format, addDays } from 'date-fns';

function parseAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractYieldAmount(row) {
  return parseAmount(
    row?.amount
      ?? row?.volume
      ?? row?.liters
      ?? row?.milk_volume
      ?? row?.milkVolume
      ?? row?.yield_amount
      ?? row?.yieldAmount
      ?? row?.volume_liters
      ?? row?.volumeLiters
      ?? row?.quantity
      ?? row?.qty
      ?? 0
  );
}

export function extractYieldDate(row) {
  const raw = row?.date
    ?? row?.milkingDate
    ?? row?.milking_date
    ?? row?.created_at
    ?? row?.createdAt
    ?? row?.recorded_at
    ?? row?.recordedAt
    ?? row?.logged_at
    ?? row?.loggedAt
    ?? row?.entry_date
    ?? row?.entryDate
    ?? row?.timestamp;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function extractYieldCowId(row) {
  return String(
    row?.cow_id
      ?? row?.cowId
      ?? row?.animal_id
      ?? row?.animalId
      ?? row?.cow_tag
      ?? row?.cowTag
      ?? row?.tag_number
      ?? row?.tagNumber
      ?? ''
  ).trim();
}

export function metricFromSummary(summary, keys) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (summary[key] !== undefined && summary[key] !== null) {
      const parsed = Number.parseFloat(summary[key]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function buildTrendData(rows, dateRange) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const totalsByDate = new Map();

  rows.forEach((row) => {
    const date = extractYieldDate(row);
    if (!date) {
      return;
    }

    const current = totalsByDate.get(date) ?? 0;
    totalsByDate.set(date, current + extractYieldAmount(row));
  });

  const sortedEntries = Array.from(totalsByDate.entries()).sort(([a], [b]) => a.localeCompare(b));

  // If no dateRange is provided, default to the last 14 days from the available data
  if (!dateRange?.from || !dateRange?.to) {
    return sortedEntries.slice(-14).map(([date, value]) => ({
      date,
      value: Number(value.toFixed(1)),
    }));
  }

  const fromStr = format(dateRange.from, 'yyyy-MM-dd');
  const toStr = format(dateRange.to, 'yyyy-MM-dd');

  // Filter entries within the selected date range
  const filteredEntries = sortedEntries.filter(([date]) => date >= fromStr && date <= toStr);
  const dataMap = new Map(filteredEntries);

  const filledData = [];
  let currentDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);

  // Fill in all dates within the range, even if no data exists for them
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    filledData.push({
      date: dateStr,
      value: Number((dataMap.get(dateStr) || 0).toFixed(1)), // Use 0 if no data for the date
    });
    currentDate = addDays(currentDate, 1); // Increment date by one day
  }

  return filledData;
}