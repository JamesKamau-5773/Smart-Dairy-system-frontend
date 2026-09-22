export const ANIMAL_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ANIMAL_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED_ANIMAL_PHOTO_TYPES = new Set(ANIMAL_PHOTO_ACCEPT.split(','));

export function getAnimalPhotoValidationError(file) {
  if (!file) return 'Choose a photo to upload.';
  if (!ALLOWED_ANIMAL_PHOTO_TYPES.has(file.type)) {
    return 'Choose a JPG, PNG, or WebP photo.';
  }
  if (file.size > ANIMAL_PHOTO_MAX_BYTES) {
    return 'Photo must be 3 MB or smaller.';
  }
  return null;
}