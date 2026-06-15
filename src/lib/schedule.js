export const SCHEDULE_STORAGE_KEY = 'operations_schedule_planner';

export const DEFAULT_DAILY_SHIFT_TASKS = [
  {
    id: 1,
    time: '05:00 AM – 05:30 AM',
    title: 'Stall Prep & Cleaning',
    goal: 'Keep the sleeping area pristine before the day begins.',
    checklist: 'Quick-sweep the dung out of the cubicles.\nSprinkle clean, dry bedding.',
  },
  {
    id: 2,
    time: '05:30 AM – 07:00 AM',
    title: 'Morning Milking & Individual Top-Ups',
    goal: 'Maximize morning yield safely.',
    checklist: 'Lock the cows into the stanchions.\nScoop the individual production-based dairy meal top-ups into each cow\'s specific feeding bowl.\nWash udders with warm water and milk them out completely.',
  },
  {
    id: 3,
    time: '07:00 AM – 08:00 AM',
    title: 'Trough Cleanout & FEEDING #1 (Morning)',
    goal: 'Provide fresh, uniform fuel for the day.',
    checklist: 'Release cows from the milking bale.\nCrucial: Scoop all stale, rejected woody stems out of the concrete trough.\nMix and deliver Meal #1 (Uniform TMR mix: Chopped Forage + Silage + Diluted Molasses + Base Dairy Meal).',
  },
  {
    id: 4,
    time: '08:00 AM – 01:00 PM',
    title: 'The Digestion & Rest Window',
    goal: 'Allow the herd to process their morning meal in peace.',
    checklist: 'Herdsman washes down the concrete walkways to keep standing surfaces dry.\nLeave the cows in absolute peace to lie down in their clean cubicles and chew their cud.',
  },
  {
    id: 5,
    time: '01:00 PM – 01:30 PM',
    title: 'FEEDING #2 (Mid-Day Boost)',
    goal: 'Stimulate appetite during the afternoon heat.',
    checklist: 'Deliver Meal #2 (The exact same uniform recipe as morning, fresh from the mixing area).\nLet the fresh aroma act as a "dinner bell" for the herd.',
  },
  {
    id: 6,
    time: '01:30 PM – 05:00 PM',
    title: 'Afternoon Rest & Water Check',
    goal: 'Ensure maximum hydration.',
    checklist: 'Clean out the water troughs and refill them with fresh, cool water.\nAllow the cows to return to their cubicles to rest.',
  },
  {
    id: 7,
    time: '05:00 PM – 05:30 PM',
    title: 'FEEDING #3 (Evening Feed)',
    goal: 'Provide high-quality, un-sorted fuel for the long night hours.',
    checklist: 'Deliver Meal #3 (The final fresh batch of the uniform mixed ration).',
  },
  {
    id: 8,
    time: '05:30 PM – 07:00 PM',
    title: 'Evening Milking & Individual Top-Ups',
    goal: 'Conduct evening milking exactly 12 hours after the morning start.',
    checklist: 'Lock the cows back into the stanchions.\nDeliver the second half of their individual production-based dairy meal top-ups in their bowls.\nConduct the evening milking.',
  },
  {
    id: 9,
    time: '07:00 PM Onward',
    title: 'Final Night Lockdown',
    goal: 'Secure the barn and leave the yard clean overnight.',
    checklist: 'Release cows to the yard to eat their evening feed.\nScrape the walkways clear of dung one last time.\nCheck that water is full, and turn off the main lights.',
  },
];

export function normalizeScheduleTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return DEFAULT_DAILY_SHIFT_TASKS;
  }

  return tasks;
}

export function loadScheduleTasks() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return DEFAULT_DAILY_SHIFT_TASKS;

    const parsed = JSON.parse(raw);
    return normalizeScheduleTasks(parsed);
  } catch {
    return DEFAULT_DAILY_SHIFT_TASKS;
  }
}

export function saveScheduleTasks(tasks) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(normalizeScheduleTasks(tasks)));
  } catch {
    // ignore storage failures in local dev
  }
}
