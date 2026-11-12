/**
 * Kiswahili for the Production Log. Same keys as production.en.js; anything missing falls back
 * to English. Lines marked REVIEW need checking by a native speaker before release.
 */
export const productionCopy = {
  title: 'Rekodi za Maziwa',
  recordMilk: 'Rekodi maziwa',
  feedCalf: 'Lisha ndama',
  rowsLabel: 'rekodi za maziwa',
  sectionLabel: 'Rekodi za maziwa',
  searchLabel: 'Tafuta kwa jina la ng’ombe au namba ya hereni',
  searchPlaceholder: 'Tafuta jina au namba ya hereni',
  date: 'Tarehe',
  session: 'Kipindi',

  columns: {
    session: 'Kipindi',
    milker: 'Mkamuaji',
    cow: 'Ng’ombe',
    litres: 'Lita',
    status: 'Hali',
    actions: 'Vitendo',
  },
  sessions: { morning: 'Asubuhi', afternoon: 'Mchana', evening: 'Jioni', unknown: 'Haijulikani' },
  statuses: { Verified: 'Imethibitishwa', Pending: 'Inasubiri', Flagged: 'Imealamishwa', Isolated: 'Yametengwa' }, // REVIEW: "Flagged", "Isolated" (milk kept apart)

  milker: 'Mkamuaji',
  verify: 'Thibitisha',
  edit: 'Badilisha',
  delete: 'Futa',
  actionsFor: (cow) => `Vitendo vya rekodi ya maziwa ya ${cow}`,

  emptyFirst: 'Bado hakuna maziwa yaliyorekodiwa. Ukamuaji utakaorekodiwa utaonekana hapa.',
  recordFirst: 'Rekodi ukamuaji wa kwanza',
  emptyFiltered: 'Hakuna rekodi za maziwa zinazolingana na vichujio ulivyochagua.',

  deleteTitle: 'Futa rekodi ya maziwa',
  deleteMessage: (cow) => `Futa rekodi ya maziwa ya ${cow}? Hili haliwezi kurudishwa.`,
  deleted: 'Rekodi ya maziwa imefutwa.',
  deleteFailed: 'Imeshindwa kufuta rekodi hii ya maziwa. Jaribu tena.',
  verifyFailed: 'Imeshindwa kuthibitisha rekodi hii ya maziwa. Jaribu tena.',

  medicineTitle: 'Ng’ombe walio kwenye dawa: usichanganye maziwa yao',
  medicineMessage: (count) => `Ng’ombe ${count} ${count === 1 ? 'yuko' : 'wako'} katika kipindi cha kusubiri dawa kuisha. Rekodi za maziwa yao zimezuiliwa ili maziwa mengine yasichafuliwe.`, // REVIEW: "withdrawal period"

  summary: {
    totalMilk: 'Jumla ya maziwa',
    avgPerDay: 'Wastani kwa siku',
    entries: 'Rekodi',
    fedToCalves: 'Yaliyonyweshwa ndama', // REVIEW
    available: 'Yaliyopo',
    // The period's own word isn't repeated, so no noun-class agreement is needed.
    // eslint-disable-next-line no-unused-vars
    emptyCurrent: (_periodName) => 'Hakuna rekodi katika kipindi hiki',
    emptyIn: (label) => `Hakuna rekodi katika ${label}`,
    lastEntry: (date) => ` · rekodi ya mwisho ${date}`,
  },
  group: {
    noun: ['rekodi', 'rekodi'],
    entries: (_count, formatted) => `rekodi ${formatted}`,
    perDayUnit: 'L/siku',
    describe: (litres, perDay) => `${litres}, ${perDay} kwa siku`,
  },

  queued: {
    title: (count) => `Bado hazijatumwa (${count})`,
    savedHere: 'Zimehifadhiwa kwenye simu hii.',
    whenOnline: 'Zitatumwa zenyewe ukirudi mtandaoni.',
    sending: 'Inatuma sasa…',
    soon: 'Zitatumwa zenyewe baada ya muda mfupi.',
    cow: 'Ng’ombe',
    needsAttention: 'Inahitaji uangalizi',
    notSent: 'Bado haijatumwa',
  },

  calves: {
    title: 'Ulishaji wa ndama wa karibuni',
    viewAll: 'Ona zote',
    loading: 'Inapakia ulishaji wa ndama…',
    failed: 'Imeshindwa kupakia ulishaji wa ndama.',
    empty: 'Hakuna ulishaji wa ndama uliorekodiwa.',
    date: 'Tarehe',
    calf: 'Ndama',
    litres: 'Lita',
    notes: 'Maelezo',
  },
};
