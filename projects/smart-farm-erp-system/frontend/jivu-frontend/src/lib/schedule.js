export const SCHEDULE_STORAGE_KEY = 'operations_schedule_planner';

export function normalizeScheduleTasks(tasks) {
  return Array.isArray(tasks) ? tasks : [];
}

export function loadScheduleTasks() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return normalizeScheduleTasks(parsed);
  } catch {
    return [];
  }
}

export function saveScheduleTasks(tasks) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(normalizeScheduleTasks(tasks)));
  } catch {
    // ignore storage failures in local dev
  }
}
