import { describe, it, expect } from 'vitest';
import { normalizeBreedingLogPayload, normalizeBreedingLog } from '../breedingUtils';

describe('breedingUtils', () => {
  it('includes AI certificate metadata and derived dates in the payload', () => {
    const payload = normalizeBreedingLogPayload({
      cowId: 'COW-001',
      aiDate: '2026-08-11',
      aiTime: '14:30',
      sireCode: 'FR-889',
      semenSource: 'vet_provided',
      technician: 'Dr. John',
      ownerName: 'Elizabeth Mugo',
      farmLocation: 'Bahati',
      serviceFee: 2500,
      certificateNumber: 'AI-817',
      isRepeatService: true,
      notes: 'Follow-up AI service',
    });

    expect(payload).toMatchObject({
      cow_id: 'COW-001',
      insemination_date: '2026-08-11',
      insemination_time: '14:30',
      semen_id: 'FR-889',
      technician_name: 'Dr. John',
      owner_name: 'Elizabeth Mugo',
      farm_location: 'Bahati',
      service_fee: 2500,
      certificate_number: 'AI-817',
      is_repeat_service: true,
      notes: 'Follow-up AI service',
      provided_by: 'VET',
    });
  });

  it('reads expected calving and pregnancy check dates from backend responses', () => {
    const normalized = normalizeBreedingLog({
      cowId: 'COW-001',
      cowName: 'Princess',
      aiDate: '2026-08-11',
      sireCode: 'FR-889',
      expected_calving_date: '2027-05-20',
      pregnancy_check_date: '2026-09-01',
      status: 'Pending',
    });

    expect(normalized.expectedCalvingDate).toBe('2027-05-20');
    expect(normalized.pregnancyCheckDate).toBe('2026-09-01');
  });

  it('maps a failed backend outcome to Open so completed checks leave the vet queue', () => {
    const normalized = normalizeBreedingLog({
      id: 41,
      status: 'Failed',
    });

    expect(normalized.status).toBe('Open');
  });
});
