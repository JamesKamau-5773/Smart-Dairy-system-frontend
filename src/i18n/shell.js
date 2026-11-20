import { localizedCopy } from './locale';
import { shellCopy as en } from './shell.en';
import { shellCopy as sw } from './shell.sw';

/** App shell text in the current language (see shell.en.js for the keys). */
export const shellCopy = localizedCopy({ en, sw });
