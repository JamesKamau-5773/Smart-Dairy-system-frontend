/**
 * Pure payload/validation builders for the Cow Register's "Log Action" modal.
 * Kept separate from AnimalRecord.jsx so the field-shaping logic is
 * independently testable and isn't tangled with component/query orchestration.
 */
import { ValidationRules } from './validation';
import { normalizeBreedingLogPayload } from './breedingUtils';

export function getAnimalActionValidationSchema(actionType) {
  if (actionType === 'Health') {
    return {
      description: [ValidationRules.required, ValidationRules.minLength(8)],
      diagnosis: [ValidationRules.required, ValidationRules.minLength(3)],
      medications: [ValidationRules.required, ValidationRules.minLength(3)],
      vet: [ValidationRules.required],
      followUp: [ValidationRules.required],
    };
  }

  if (actionType === 'Breeding') {
    return {
      date: [ValidationRules.required],
      sireCode: [ValidationRules.required],
    };
  }

  return {
    title: [ValidationRules.required, ValidationRules.minLength(3)],
    description: [ValidationRules.minLength(5)],
  };
}

// Mirrors the same shape MedicalRecords.jsx builds, so medicalApi.createRecord
// produces an identical record regardless of which page it was logged from.
export function buildHealthLogPayload(fields, cowId) {
  return {
    date: fields.date || new Date().toISOString().split('T')[0],
    cow: cowId,
    reason: fields.description.trim(),
    diagnosis: fields.diagnosis.trim(),
    meds: fields.medications.trim(),
    recommendations: fields.description.trim(),
    vet: fields.vet.trim(),
    status: fields.status,
    severity: fields.severity,
    followUp: fields.followUp,
  };
}

// Reuses the same normalizer BreedingHub.jsx calls, so both pages send an
// identical payload shape to breedingApi.createLog.
export function buildBreedingLogPayload(fields, cowId, cowName) {
  return normalizeBreedingLogPayload({
    cowId,
    cow_name: cowName,
    event_date: fields.date,
    sire_id: fields.sireCode.trim(),
    notes: fields.description.trim(),
    eventType: 'INSEMINATION',
    semenSource: fields.semenSource,
  });
}

export function buildGeneralEventPayload(fields) {
  return {
    event_type: 'general',
    title: fields.title.trim(),
    description: fields.description.trim(),
    event_date: fields.date ? new Date(fields.date).toISOString().replace('Z', '+00:00') : undefined,
    event_data: { source: 'animal-passport' },
    metadata: { source: 'animal-passport' },
  };
}
