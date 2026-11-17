// Every status the app shows has an English and a Kiswahili string, so nothing falls back to a
// raw backend value or to CSS case changes. Two checks:
//  1. Every status map in the en copy files exists in the sw file with the same keys, and no
//     string is empty in either language.
//  2. Every value of the backend status enums listed below has a string in both languages.
//     Add an entry here whenever a screen starts showing another backend enum.
import { describe, expect, it } from 'vitest';

const enModules = import.meta.glob('../*.en.js', { eager: true });
const swModules = import.meta.glob('../*.sw.js', { eager: true });

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const STATUS_KEY = /status(es)?$/i;

/** [path, map] for every object under a key ending in "status"/"statuses" whose values are all strings. */
function statusMaps(node, path = []) {
  if (!isPlainObject(node)) return [];
  return Object.entries(node).flatMap(([key, value]) => {
    if (!isPlainObject(value)) return [];
    const here = [...path, key];
    const isMap = STATUS_KEY.test(key) && Object.values(value).every((entry) => typeof entry === 'string');
    return isMap ? [[here, value]] : statusMaps(value, here);
  });
}

const at = (node, path) => path.reduce((current, key) => current?.[key], node);
const exportsOf = (modules, file) => modules[file] ?? {};

const enFiles = Object.keys(enModules).sort();

describe('status strings in en and sw', () => {
  it('finds the status maps', () => {
    const count = enFiles.flatMap((file) => Object.values(exportsOf(enModules, file)).flatMap((copy) => statusMaps(copy))).length;
    expect(count).toBeGreaterThan(5);
  });

  for (const enFile of enFiles) {
    const swFile = enFile.replace(/\.en\.js$/, '.sw.js');
    for (const [exportName, enCopy] of Object.entries(exportsOf(enModules, enFile))) {
      for (const [path, enMap] of statusMaps(enCopy)) {
        it(`${enFile.slice(3)} ${exportName}.${path.join('.')}`, () => {
          const swMap = at(exportsOf(swModules, swFile)[exportName], path);
          expect(swMap, `${swFile.slice(3)} has no ${path.join('.')}`).toBeTruthy();
          for (const [value, text] of Object.entries(enMap)) {
            expect(text.trim(), `en "${value}" is empty`).not.toBe('');
            expect(swMap[value]?.trim(), `sw has no string for "${value}"`).toBeTruthy();
          }
          expect(Object.keys(swMap).sort()).toEqual(Object.keys(enMap).sort());
        });
      }
    }
  }
});

// Backend enums, with the values the backend defines and where their strings live. `key` turns a
// backend value into the copy key the screen looks up (the Ledger lower-cases its statuses).
const BACKEND_STATUS_ENUMS = [
  {
    name: 'TransactionStatus (Ledger status column)',
    values: ['DRAFT', 'POSTED', 'VOIDED'],
    file: '../finance.en.js', exportName: 'financeCopy', path: ['ledger', 'statuses'],
    key: (value) => value.toLowerCase(),
  },
  {
    name: 'CowStatus (herd status)',
    values: ['Lactating', 'Dry', 'Heifer', 'Calf', 'Cow', 'Sold', 'Died'],
    file: '../herd.en.js', exportName: 'herdCopy', path: ['statuses'],
  },
  {
    name: 'AnimalCostType (cow profitability cost lines, ledger animal cost type)',
    values: ['PURCHASE', 'CALF_FEED', 'HEIFER_FEED', 'BREEDING', 'VETERINARY', 'LABOR', 'HOUSING', 'OVERHEAD', 'OTHER'],
    file: '../finance.en.js', exportName: 'financeCopy', path: ['ledgerForm', 'animalCostTypes'],
  },
  // ReceiptStatus is not published in the API contract yet (BACKEND_REQUESTS.md, BR-024); the
  // receipt shows a humanised value until it is, and gets an entry here then.
];

describe('backend status enums have en and sw strings', () => {
  for (const { name, values, file, exportName, path, key = (value) => value } of BACKEND_STATUS_ENUMS) {
    it(name, () => {
      const enMap = at(exportsOf(enModules, file)[exportName], path);
      const swMap = at(exportsOf(swModules, file.replace('.en.js', '.sw.js'))[exportName], path);
      for (const value of values) {
        expect(enMap?.[key(value)], `en has no string for ${value}`).toBeTruthy();
        expect(swMap?.[key(value)], `sw has no string for ${value}`).toBeTruthy();
      }
    });
  }
  it.todo('ReceiptStatus, once the backend publishes its values (BR-024)');
});
