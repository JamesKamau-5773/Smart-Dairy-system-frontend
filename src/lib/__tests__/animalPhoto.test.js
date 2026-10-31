import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANIMAL_PHOTO_MAX_BYTES,
  ANIMAL_PHOTO_SOURCE_MAX_BYTES,
  compressAnimalPhoto,
  formatPhotoSize,
  getAnimalPhotoSourceError,
  getAnimalPhotoValidationError,
  getScaledPhotoSize,
} from '../animalPhoto';

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

describe('getAnimalPhotoSourceError', () => {
  it('accepts full-size phone photos above the upload limit', () => {
    expect(getAnimalPhotoSourceError({ type: 'image/jpeg', size: 8 * 1024 * 1024 })).toBeNull();
  });

  it('rejects photos over 25 MB and unsupported formats', () => {
    expect(getAnimalPhotoSourceError({ type: 'image/jpeg', size: ANIMAL_PHOTO_SOURCE_MAX_BYTES + 1 })).toContain('25 MB');
    expect(getAnimalPhotoSourceError({ type: 'image/heic', size: 100 })).toContain('JPG');
  });
});

describe('photo sizing helpers', () => {
  it('scales the longest side down to 1280 px and never enlarges', () => {
    expect(getScaledPhotoSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(getScaledPhotoSize(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(getScaledPhotoSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('formats sizes for farmers', () => {
    expect(formatPhotoSize(240 * 1024)).toBe('240 KB');
    expect(formatPhotoSize(4.3 * 1024 * 1024)).toBe('4.3 MB');
  });
});

describe('compressAnimalPhoto', () => {
  const original = new File([new Uint8Array(5 * 1024 * 1024)], 'neema.png', { type: 'image/png' });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns the original file when the browser cannot decode images', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    expect(await compressAnimalPhoto(original)).toBe(original);
  });

  it('resizes and re-encodes large photos as a smaller JPEG', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }));
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback, type) => callback(new Blob([new Uint8Array(200 * 1024)], { type })),
    };
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas' ? canvas : createElement(tag)));

    const result = await compressAnimalPhoto(original);

    expect(result).not.toBe(original);
    expect(result.name).toBe('neema.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(result.size).toBe(200 * 1024);
    expect([canvas.width, canvas.height]).toEqual([1280, 960]);
    expect(drawImage).toHaveBeenCalled();
  });

  it('keeps the original when re-encoding would not make it smaller', async () => {
    const small = new File([new Uint8Array(10)], 'tiny.jpg', { type: 'image/jpeg' });
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100 }));
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas'
      ? { getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb, type) => cb(new Blob([new Uint8Array(500)], { type })) }
      : createElement(tag)));

    expect(await compressAnimalPhoto(small)).toBe(small);
  });

  it('falls back to the original when decoding fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('corrupt')));
    expect(await compressAnimalPhoto(original)).toBe(original);
  });
});
