import { localizedCopy } from './locale';
import { staffCopy as en } from './staff.en';
import { staffCopy as sw } from './staff.sw';

/** Staff, access and payroll text in the current language (see staff.en.js for the keys). */
export const staffCopy = localizedCopy({ en, sw });
