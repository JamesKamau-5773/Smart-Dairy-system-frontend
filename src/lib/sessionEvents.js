// Fired by apiClient when the server rejects the session (401); AuthProvider shows the
// sign-in sheet over the current page instead of navigating away.
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

// Fired by both API clients when the backend refuses a request because this is the public demo
// (DEMO_READ_ONLY / DEMO_FEATURE_UNAVAILABLE). `detail.error` is the failed request.
export const DEMO_REFUSED_EVENT = 'auth:demo-refused';
