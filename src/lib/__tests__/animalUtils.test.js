import { describe, expect, it } from 'vitest';
import { normalizeAnimal } from '../animalUtils';

describe('normalizeAnimal', () => {
  it('uses backend-owned status and recent yield metrics', () => {
    const animal = normalizeAnimal({
      id: 48,
      name: 'Sofia',
      current_status: 'Lactating',
      days_in_milk: null,
      yesterday_yield_liters: 11.5,
      seven_day_average_liters: 11.53,
    });

    expect(animal.current_status).toBe('Lactating');
    expect(animal.daysInMilk).toBeNull();
    expect(animal.milk).toBe('11.5 L/day');
    expect(animal.yesterdayYield).toBe('11.5 L');
    expect(animal.sevenDayAvg).toBe('11.5 L');
  });

  it('preserves saved sire and dam fields from the backend response', () => {
    const animal = normalizeAnimal({
      id: 53,
      sire_name: 'o11ho15935',
      dam_id: 41,
    });

    expect(animal.sire).toBe('o11ho15935');
    expect(animal.dam).toBe('ID 41');
  });

  it('formats the backend parent DTO before it reaches a React child', () => {
    const animal = normalizeAnimal({
      dam: {
        id: 41,
        name: 'Princess',
        tag_number: '001',
      },
    });

    expect(animal.dam).toBe('Princess · 001');
  });

  it('preserves the backend-owned birth weight', () => {
    const animal = normalizeAnimal({ birth_weight_kg: 32.5 });

    expect(animal.birthWeightKg).toBe(32.5);
  });

  it('resolves a backend-hosted photo URL', () => {
    const animal = normalizeAnimal({ photo_url: '/uploads/animal_photos/tenant_1/cow.webp' });

    expect(animal.photoUrl).toBe('http://localhost:5000/uploads/animal_photos/tenant_1/cow.webp');
  });

});