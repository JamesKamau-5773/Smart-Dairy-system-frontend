import { localizedCopy } from './locale';
import { errorsCopy as en } from './errors.en';
import { errorsCopy as sw } from './errors.sw';

/** Error and failure text in the current language (see errors.en.js for the keys). */
export const errorsCopy = localizedCopy({ en, sw });
