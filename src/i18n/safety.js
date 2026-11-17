import { localizedCopy } from './locale';
import { safetyCopy as en } from './safety.en';
import { safetyCopy as sw } from './safety.sw';

/** Milk safety board text in the current language (see safety.en.js for the keys). */
export const safetyCopy = localizedCopy({ en, sw });
