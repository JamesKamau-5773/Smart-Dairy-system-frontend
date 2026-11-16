import { localizedCopy } from './locale';
import { ledgerCopy as en } from './ledger.en';
import { ledgerCopy as sw } from './ledger.sw';

/** Ledger table text in the current language (see ledger.en.js for the keys). */
export const ledgerCopy = localizedCopy({ en, sw });
