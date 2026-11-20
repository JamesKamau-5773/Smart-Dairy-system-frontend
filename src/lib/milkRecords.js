// Milk records on the Production Log: the API row mapped for display, and the phone list's
// grouping. Display only: litres are formatted, never added up; the date, session, status and
// the change against the cow's average are the backend's.
import { toLocalIsoDate } from './localDate';
import { toLitresText } from './numberFormat';

const AMOUNT_FIELD_CANDIDATES = [
  'amount', 'volume', 'liters', 'milk_volume', 'milkVolume', 'yield_amount', 'yieldAmount',
  'volume_liters', 'volumeLiters', 'quantity', 'qty', 'amount_liters', 'amountLiters',
  'quantity_liters', 'quantityLiters', 'milk_amount', 'milkAmount', 'produced_liters', 'producedLiters',
];

function logDevWarning(message, details) {
  if (!import.meta.env?.DEV) return;
  console.warn(`[productionLog] ${message}`, details);
}

function extractAmountCandidate(row) {
  if (!row || typeof row !== 'object') return { value: null, key: null, found: false };
  for (const key of AMOUNT_FIELD_CANDIDATES) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== '') {
      return { value: row[key], key, found: true };
    }
  }
  return { value: null, key: null, found: false };
}

const BACKEND_STATUS_MAP = {
  RECORDED: 'Pending',
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  FLAGGED: 'Flagged',
  ISOLATED: 'Isolated',
};

// A record without a status shows "—": the backend decides it, the page never assumes one.
function normalizeStatus(raw) {
  if (!raw) return null;
  return BACKEND_STATUS_MAP[String(raw).toUpperCase()] ?? raw;
}

const booleanOrNull = (value) => (value === true || value === false ? value : null);

/** Maps a yield record from the API to what the page shows. */
export function normalizeYieldRow(row) {
  const amountCandidate = extractAmountCandidate(row);
  const timestamp = row?.timestamp ?? row?.createdAt ?? row?.created_at ?? null;

  if (!amountCandidate.found) {
    logDevWarning('Yield row missing expected amount field.', {
      rowId: row?.id ?? row?.yield_id ?? row?.recordId ?? null,
      knownAmountKeys: AMOUNT_FIELD_CANDIDATES,
      receivedKeys: row && typeof row === 'object' ? Object.keys(row) : [],
      row,
    });
  }

  return {
    id: row?.id ?? row?.yield_id ?? row?.recordId,
    bucket: row?.bucket ?? null,
    // The farm-local day the backend files the record under (its `bucket.day`).
    day: row?.bucket?.day ?? null,
    date: row?.date ?? row?.milkingDate ?? row?.milking_date ?? row?.entry_date ?? (timestamp ? toLocalIsoDate(timestamp) : null),
    time: timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row?.time ?? null),
    timestamp,
    milker: row?.milker_name ?? row?.milker ?? row?.created_by ?? null,
    // The employee chosen as milker, or null when the person who entered it milked.
    milkerId: row?.milker_id ?? null,
    animalRefId: row?.cow_tag ?? row?.cowTag ?? row?.animal_id ?? row?.animalId ?? row?.cow_id ?? row?.cowId ?? row?.cow ?? null,
    cowId: row?.cow_tag ?? row?.cowTag ?? row?.cowId ?? row?.cow_id ?? row?.animal_id ?? '',
    cowName: row?.cowName ?? row?.cow_name ?? row?.animal_name ?? row?.animalName ?? row?.name ?? '',
    amount: amountCandidate.value,
    session: row?.session ?? row?.milking_session ?? row?.milkingSession ?? null,
    status: normalizeStatus(row?.status),
    // This record's litres against the cow's 7-day average for the same session, the average
    // itself, and whether the backend counts it as a significant drop (BR-026). "—" when not sent.
    vsAvgLitres: row?.vs_avg_litres ?? null,
    avgLitres: row?.avg_litres ?? null,
    significantDrop: row?.significant_drop === true,
    // Who entered the record (a person) or how (`recorded_via`) (BR-019).
    recordedBy: row?.recorded_by_name ?? null,
    recordedVia: row?.recorded_via ?? null,
    // TODO(BR-029): whether the person who entered it is the milker, and when it was entered.
    // Null until sent: the page shows the recorder, and no "Recorded at" line.
    recordedByIsMilker: booleanOrNull(row?.recorded_by_is_milker),
    recordedAt: row?.recorded_at ?? null,
  };
}

/**
 * The phone list's groups: one per farm day and session, in the order the backend sent the
 * records (newest first), so nothing is sorted here. Records of the same day and session that
 * arrive together form one group.
 *
 * @returns {Array<{ key: string, day: string|null, session: string|null, records: object[] }>}
 */
export function groupByDaySession(records) {
  const groups = [];
  for (const record of records) {
    const day = record.day ?? record.date ?? null;
    const session = record.session ?? null;
    const key = `${day ?? '—'}|${String(session ?? '').toLowerCase()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.records.push(record);
    else groups.push({ key: groups.some((group) => group.key === key) ? `${key}#${groups.length}` : key, day, session, records: [record] });
  }
  return groups;
}

/**
 * The backend's change against the cow's average, for display: `{ direction, litres }` with
 * direction "down", "up" or "level" and the size as "0.9 L" (its digits as sent), or null
 * when the backend sent none.
 */
export function vsAverage(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim().replace(/^−/, '-');
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return { direction: number < 0 ? 'down' : number > 0 ? 'up' : 'level', litres: `${toLitresText(text.replace(/^[-+]/, ''))} L` };
}

/** How a status stands out on the phone list: only exceptions get a badge. */
export function statusEmphasis(status) {
  if (status === 'Pending') return 'outline';
  if (status === 'Flagged' || status === 'Isolated') return 'solid';
  return null;
}
