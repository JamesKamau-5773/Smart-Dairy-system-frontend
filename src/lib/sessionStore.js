import localforage from 'localforage';

const SESSION_KEY = 'jivu_user';
const durableSessionStore = localforage.createInstance({
  name: 'jivu',
  storeName: 'authenticated_session',
});

export async function loadSession() {
  const activeSession = sessionStorage.getItem(SESSION_KEY);
  if (activeSession) return JSON.parse(activeSession);

  const durableSession = await durableSessionStore.getItem(SESSION_KEY);
  if (durableSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(durableSession));
  }
  return durableSession;
}

export async function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  await durableSessionStore.setItem(SESSION_KEY, session);
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