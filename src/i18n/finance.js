import { localizedCopy } from './locale';
import { financeCopy as en } from './finance.en';
import { financeCopy as sw } from './finance.sw';

/** Buyers, ledger and money text in the current language (see finance.en.js for the keys). */
export const financeCopy = localizedCopy({ en, sw });

/** A saved customer type in the current language; a type the farmer typed is shown as typed. */
export const customerTypeLabel = (type) => (type ? financeCopy.customerTypes[type] ?? type : financeCopy.customerTypes.Standard);
