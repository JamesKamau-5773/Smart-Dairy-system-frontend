import { localizedCopy } from './locale';
import { feedCopy as en } from './feed.en';
import { feedCopy as sw } from './feed.sw';

/** Feed planning and inventory text in the current language (see feed.en.js for the keys). */
export const feedCopy = localizedCopy({ en, sw });
