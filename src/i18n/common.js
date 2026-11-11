import { localizedCopy } from './locale';
import { commonCopy as en } from './common.en';
import { commonCopy as sw } from './common.sw';

/** Shared building-block text in the current language (see common.en.js for the keys). */
export const commonCopy = localizedCopy({ en, sw });
