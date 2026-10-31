export const ANIMAL_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ANIMAL_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
// Phone cameras often produce 4–12 MB photos; accept them and shrink before upload.
export const ANIMAL_PHOTO_SOURCE_MAX_BYTES = 25 * 1024 * 1024;
export const ANIMAL_PHOTO_MAX_DIMENSION = 1280;
const ANIMAL_PHOTO_JPEG_QUALITY = 0.8;

const ALLOWED_ANIMAL_PHOTO_TYPES = new Set(ANIMAL_PHOTO_ACCEPT.split(','));

/** Checks the photo the farmer picked, before it is shrunk. */
export function getAnimalPhotoSourceError(file) {
  if (!file) return 'Choose a photo to upload.';
  if (!ALLOWED_ANIMAL_PHOTO_TYPES.has(file.type)) {
    return 'Choose a JPG, PNG, or WebP photo.';
  }
  if (file.size > ANIMAL_PHOTO_SOURCE_MAX_BYTES) {
    return 'This photo is too large. Choose one under 25 MB.';
  }
  return null;
}

/** Checks the photo that will actually be uploaded. */
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

export function getScaledPhotoSize(width, height, maxDimension = ANIMAL_PHOTO_MAX_DIMENSION) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function formatPhotoSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Shrinks a photo on the phone before upload to save mobile data: longest side at most
 * 1280 px, re-encoded as JPEG. Returns the original file when the browser can't decode or
 * encode it, or when shrinking wouldn't make it smaller.
 */
export async function compressAnimalPhoto(file, { maxDimension = ANIMAL_PHOTO_MAX_DIMENSION, quality = ANIMAL_PHOTO_JPEG_QUALITY } = {}) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = getScaledPhotoSize(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
