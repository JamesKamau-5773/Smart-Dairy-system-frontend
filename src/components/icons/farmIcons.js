import { createLucideIcon } from 'lucide-react';

// Dairy icons lucide doesn't have, drawn on lucide's 24x24 grid with its 2px round strokes,
// so they sit beside lucide icons and take the same props (size, className, strokeWidth).

/** A milk churn: lid, neck, sloped shoulders with handles, a wide body and two bands. Milking. */
export const MilkChurn = createLucideIcon('milk-churn', [
  ['rect', { x: '9', y: '2', width: '6', height: '2', rx: '1', key: 'lid' }],
  ['path', { d: 'M10 4v2.5L6 10v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10l-4-3.5V4', key: 'body' }],
  ['path', { d: 'M7.5 8.7 4.5 7.5 3.5 10l2.5 1', key: 'handle-left' }],
  ['path', { d: 'm16.5 8.7 3-1.2 1 2.5-2.5 1', key: 'handle-right' }],
  ['path', { d: 'M6 13h12', key: 'band-top' }],
  ['path', { d: 'M6 18h12', key: 'band-bottom' }],
]);

/** A cow's head from the front: horns, ears, face, muzzle with nostrils, eyes. The herd. */
export const CowHead = createLucideIcon('cow-head', [
  ['path', { d: 'M7.5 7C6 6.6 5 5.3 5 3.5', key: 'horn-left' }],
  ['path', { d: 'M16.5 7c1.5-.4 2.5-1.7 2.5-3.5', key: 'horn-right' }],
  ['path', { d: 'M7 9 3 8.5l2 3.5h2', key: 'ear-left' }],
  ['path', { d: 'm17 9 4-.5-2 3.5h-2', key: 'ear-right' }],
  ['path', { d: 'M7.5 15 7 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2l-.5 6', key: 'face' }],
  ['rect', { x: '7', y: '15', width: '10', height: '6.5', rx: '3.25', key: 'muzzle' }],
  ['path', { d: 'M10 18.5h.01', key: 'nostril-left' }],
  ['path', { d: 'M14 18.5h.01', key: 'nostril-right' }],
  ['path', { d: 'M10 11h.01', key: 'eye-left' }],
  ['path', { d: 'M14 11h.01', key: 'eye-right' }],
]);

/** A drop of milk with a tick: milk that is safe to sell (withdrawal periods). */
export const MilkDropCheck = createLucideIcon('milk-drop-check', [
  ['path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z', key: 'drop' }],
  ['path', { d: 'm9 15.5 2 2 4-4', key: 'tick' }],
]);

/** Yield bars on an axis with a drop of milk above the tallest: farm reports. */
export const MilkYieldChart = createLucideIcon('milk-yield-chart', [
  ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16', key: 'axis' }],
  ['path', { d: 'M8 17v-4', key: 'bar-1' }],
  ['path', { d: 'M12.5 17v-6', key: 'bar-2' }],
  ['path', { d: 'M17 17v-4', key: 'bar-3' }],
  ['path', { d: 'M12.5 3c-.8 1.1-2 2.2-2 3.3a2 2 0 0 0 4 0c0-1.1-1.2-2.2-2-3.3z', key: 'drop' }],
]);

/** A farmhand in a brimmed hat: the people who work the farm (staff and payroll). */
export const Farmhand = createLucideIcon('farmhand', [
  ['path', { d: 'M9 6.5V5a3 3 0 0 1 6 0v1.5', key: 'crown' }],
  ['path', { d: 'M6 7h12', key: 'brim' }],
  ['path', { d: 'M9 8.5a3 3 0 0 0 6 0', key: 'face' }],
  ['path', { d: 'M5 21a7 7 0 0 1 14 0', key: 'shoulders' }],
]);
