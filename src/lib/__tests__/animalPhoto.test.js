import { describe, expect, it } from 'vitest';
import { ANIMAL_PHOTO_MAX_BYTES, getAnimalPhotoValidationError } from '../animalPhoto';

describe('getAnimalPhotoValidationError', () => {
  it('accepts supported photo formats within the size limit', () => {
    expect(getAnimalPhotoValidationError({ type: 'image/webp', size: ANIMAL_PHOTO_MAX_BYTES })).toBeNull();
  });

  it('rejects unsupported formats', () => {
    expect(getAnimalPhotoValidationError({ type: 'image/gif', size: 100 })).toContain('JPG');
  });

  it('rejects files larger than 3 MB', () => {
    expect(getAnimalPhotoValidationError({ type: 'image/jpeg', size: ANIMAL_PHOTO_MAX_BYTES + 1 })).toContain('3 MB');
  });
});