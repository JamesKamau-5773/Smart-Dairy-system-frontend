import { isDemoRefusal } from './apiErrors';
import { DEMO_REFUSED_EVENT } from './sessionEvents';

/**
 * The one place a demo refusal (403 DEMO_READ_ONLY / DEMO_FEATURE_UNAVAILABLE) is noticed.
 * Both API clients call it from their response interceptors; DemoRefusalNotice turns the event
 * into the sign-up prompt. The request still fails, so the page stops its spinner as usual.
 */
export function notifyDemoRefusal(error) {
  if (!isDemoRefusal(error)) return;
  window.dispatchEvent(new CustomEvent(DEMO_REFUSED_EVENT, { detail: { error } }));
}
