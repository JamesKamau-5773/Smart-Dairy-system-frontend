import { feedCopy } from '../i18n/feed.en';
import { getApiErrorCode } from './apiErrors';
import { getApiErrorMessage } from './backendApi';

/**
 * Message for a failed feed, nutrition or inventory request. Codes with a
 * farmer-facing explanation use it; everything else keeps the shared handling
 * (safe server text, connection problems, the caller's fallback for 500s).
 */
export function getFeedErrorMessage(error, fallback) {
  return feedCopy.errors.codes[getApiErrorCode(error)] ?? getApiErrorMessage(error, fallback);
}
