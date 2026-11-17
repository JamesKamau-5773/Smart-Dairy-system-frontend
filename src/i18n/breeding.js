import { localizedCopy } from './locale';
import { breedingCopy as en } from './breeding.en';
import { breedingCopy as sw } from './breeding.sw';

/** AI and pregnancy text in the current language (see breeding.en.js for the keys). */
export const breedingCopy = localizedCopy({ en, sw });
