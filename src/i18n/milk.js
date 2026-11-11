import { localizedCopy } from './locale';
import { milkCopy as en } from './milk.en';
import { milkCopy as sw } from './milk.sw';

/** Milk record form text in the current language (see milk.en.js for the keys). */
export const milkCopy = localizedCopy({ en, sw });
