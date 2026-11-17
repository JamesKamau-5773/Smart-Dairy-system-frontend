import { localizedCopy } from './locale';
import { dashboardCopy as en } from './dashboard.en';
import { dashboardCopy as sw } from './dashboard.sw';

/** Dashboard text in the current language (see dashboard.en.js for the keys). */
export const dashboardCopy = localizedCopy({ en, sw });
