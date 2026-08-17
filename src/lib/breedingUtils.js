/**
 * Takes a raw form data object for a breeding log entry and transforms it
 * into a clean, consistent payload suitable for the backend API.
 * This ensures that the API always receives data in the expected format.
 *
 * @param {object} formData - The raw data from the breeding log form.
 * @returns {object | null} A structured payload for the API, or null if validation fails.
 */
export function normalizeBreedingLogPayload(formData) {
  if (!formData) {
    console.error("normalizeBreedingLogPayload received null or undefined formData");
    return null;
  }

  // Determine the 'provided_by' value based on the form's radio button selection.
  // The backend expects 'FARM' or 'VET'.
  const providedBy = formData.semenSource === 'vet_provided' ? 'VET' : 'FARM';

  const payload = {
    // Map frontend field names to the backend's expected keys
    cow_id: formData.animal_id || formData.cowId || formData.cow_id,
    insemination_date: formData.eventDate || formData.event_date || formData.insemination_date,

    // Pass through other relevant fields
    event_type: formData.eventType || formData.event_type || 'INSEMINATION',
    technician: formData.technician || null,
    notes: formData.notes || '',

    // Add the fields required by the backend for validation
    provided_by: providedBy,
    semen_id: formData.sire_id || formData.sireId || formData.semen_id || null,
  };

  // Validate against the backend's required fields
  if (!payload.cow_id || !payload.insemination_date) {
    console.error("Breeding log payload is missing required fields (cow_id, insemination_date).", payload);
    return null;
  }

  return payload;
}

export function normalizeSemenInventory(item = {}) {
  const stableId = item.id ?? item.item_id ?? item.straw_code ?? item.code ?? item.bull_code ?? item.bull_name ?? item.name;

  return {
    id: String(stableId ?? '').trim() || `bull-${Date.now()}`,
    name: item.name ?? item.bull_name ?? 'Unnamed Bull',
    code: item.code ?? item.bull_code ?? item.straw_code ?? '',
    strawsLeft: Number(item.strawsLeft ?? item.straws_left ?? item.stock_level ?? item.quantity ?? 0),
    improves: item.improves ?? item.breed_improvement ?? item.breed ?? item.best_for ?? item.purpose ?? '',
  };
}

export function normalizeBreedingLog(log = {}) {
  const rawAiDate = log.aiDate
    ?? log.ai_date
    ?? log.insemination_date
    ?? log.service_date
    ?? log.event_date
    ?? log.date
    ?? log.created_at
    ?? '';
  const aiDate = normalizeDateForApi(rawAiDate) || '';
  const computedDaysPostAI = aiDate
    ? Math.max(0, Math.floor((Date.now() - new Date(aiDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const daysPostAI = Number(log.daysPostAI ?? log.days_post_ai ?? computedDaysPostAI);
  const expectedCalvingDate = log.expectedCalvingDate ?? log.expected_calving_date ?? log.calving_due_date ?? null;
  const rawStatus = String(log.status ?? log.check_status ?? log.outcome_status ?? 'Pending').trim().toLowerCase();
  let status = 'Pending';
  const rawProvidedBy = String(log.provided_by ?? '').trim().toLowerCase();
  const rawSource = String(log.semenSource ?? log.semen_source ?? '').trim().toLowerCase();
  const rawSourceLabel = String(log.semen_source_label ?? '').trim().toLowerCase();
  const cowId = String(
    log.cowId
    ?? log.cow_id
    ?? log.cow_tag
    ?? log.tag_number
    ?? log.animal_id
    ?? log.cow
    ?? ''
  ).trim();
  const cowName = String(
    log.cowName
    ?? log.cow_name
    ?? log.animal_name
    ?? log.name
    ?? ''
  ).trim();

  if (['pregnant', 'in-calf', 'incalf', 'confirmed_pregnant'].includes(rawStatus)) {
    status = 'Pregnant';
  } else if (['open', 'not pregnant', 'not_pregnant', 'negative'].includes(rawStatus)) {
    status = 'Open';
  } else if (['pending', 'pending check', 'pending_check', 'awaiting_check', 'awaiting'].includes(rawStatus)) {
    status = 'Pending';
  }

  return {
    id: log.id ?? log.log_id ?? log.breeding_log_id ?? `log-${Date.now()}`,
    cowId,
    cowName,
    aiDate,
    sireCode: log.sireCode
      ?? log.sire_code
      ?? log.semen_id
      ?? log.external_sire_code
      ?? log.straw_code
      ?? log.bull_code
      ?? log.bull_name
      ?? '',
    semenSource: rawSource
      || (rawProvidedBy === 'vet' ? 'vet_provided' : '')
      || (rawProvidedBy === 'inventory' ? 'farm_stock' : '')
      || (rawSourceLabel.includes('vet') ? 'vet_provided' : '')
      || (rawSourceLabel.includes('farm') || rawSourceLabel.includes('stock') ? 'farm_stock' : 'unknown'),
    expectedCalvingDate,
    daysPostAI,
    status,
    notes: log.note ?? log.notes ?? '',
  };
}

export function normalizeHerdOption(cow = {}) {
  const id = String(cow.tag_number ?? cow.tagNumber ?? cow.tag ?? cow.cow_id ?? cow.ear_tag ?? cow.id ?? '').trim();
  const name = String(cow.name ?? cow.cow_name ?? cow.animal_name ?? '').trim();
  const display = name ? `${id} (${name})` : id;

  return {
    id,
    name,
    display,
  };
}

export function normalizeDateForApi(rawDate = '') {
  const input = String(rawDate ?? '').trim();
  if (!input) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function normalizeSemenCode(rawCode = '') {
  return String(rawCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

export function resolveCowId(rawValue = '', herdOptions = []) {
  const input = String(rawValue).trim();
  if (!input) return '';

  const exact = herdOptions.find((option) => (
    option.id.toLowerCase() === input.toLowerCase()
    || option.name.toLowerCase() === input.toLowerCase()
    || option.display.toLowerCase() === input.toLowerCase()
  ));

  if (exact?.id) {
    return exact.id;
  }

  const parsedFromDisplay = input.match(/^([^()]+)\s*\(/);
  if (parsedFromDisplay?.[1]) {
    return parsedFromDisplay[1].trim();
  }

  return input;
}

export function resolveCowIdentity(rawValue = '', herdOptions = []) {
  const input = String(rawValue).trim();
  if (!input) return { id: '', name: '' };

  const exact = herdOptions.find((option) => (
    option.id.toLowerCase() === input.toLowerCase()
    || option.name.toLowerCase() === input.toLowerCase()
    || option.display.toLowerCase() === input.toLowerCase()
  ));

  if (exact) {
    return { id: exact.id, name: exact.name || '' };
  }

  const parsedFromDisplay = input.match(/^([^()]+)\s*\(([^)]+)\)$/);
  if (parsedFromDisplay) {
    return {
      id: parsedFromDisplay[1].trim(),
      name: parsedFromDisplay[2].trim(),
    };
  }

  return { id: resolveCowId(input, herdOptions), name: '' };
}