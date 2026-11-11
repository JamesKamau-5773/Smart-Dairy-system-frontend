import { localizedCopy } from './locale';
import { authCopy as en } from './auth.en';
import { authCopy as sw } from './auth.sw';

/** Sign-in and account text in the current language (see auth.en.js for the keys). */
export const authCopy = localizedCopy({ en, sw });
