import { localizedCopy } from './locale';
import { adminCopy as en } from './admin.en';
import { adminCopy as sw } from './admin.sw';

/** Admin, onboarding and account-claim text in the current language (see admin.en.js for the keys). */
export const adminCopy = localizedCopy({ en, sw });
