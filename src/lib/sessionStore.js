import localforage from 'localforage';

const SESSION_KEY = 'jivu_user';
const durableSessionStore = localforage.createInstance({
  name: 'jivu',
  storeName: 'authenticated_session',
});

function isValidSession(session) {
  return session
    && typeof session === 'object'
    && typeof session.token === 'string'
    && session.token.trim().length > 0;
}

export async function loadSession() {
  const activeSession = sessionStorage.getItem(SESSION_KEY);
  if (activeSession) {
    try {
      const parsed = JSON.parse(activeSession);
      return isValidSession(parsed) ? parsed : null;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  const durableSession = await durableSessionStore.getItem(SESSION_KEY);
  if (isValidSession(durableSession)) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(durableSession));
    return durableSession;
  }

  if (durableSession) {
    await durableSessionStore.removeItem(SESSION_KEY);
  }
  return null;
}

export async function saveSession(session) {
  const normalizedSession = isValidSession(session) ? session : null;
  if (!normalizedSession) {
    throw new Error('Authentication response is missing an access token.');
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));
  await durableSessionStore.setItem(SESSION_KEY, normalizedSession);
  return normalizedSession;
}

export async function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  await durableSessionStore.removeItem(SESSION_KEY);
}

export function readActiveSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}