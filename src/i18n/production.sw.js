/**
 * Kiswahili for the Production Log. Same keys as production.en.js; anything missing falls back
 * to English. Lines marked REVIEW need checking by a native speaker before release.
 */
export const productionCopy = {
  title: 'Rekodi za Maziwa',
  heading: { lead: 'Rekodi', rest: 'ya Maziwa ya Kila Siku' }, // REVIEW
  description: 'Kagua rekodi za maziwa, ona ng’ombe walio kwenye dawa, na fanya kazi mahali pamoja kwa vichujio na historia ya mabadiliko.', // REVIEW
  recordMilk: 'Rekodi Maziwa',
  feedCalf: 'Lisha Ndama',
  rowsLabel: 'rekodi za maziwa',
  sectionLabel: 'Rekodi za maziwa',
  searchLabel: 'Tafuta kwa jina la ng’ombe au namba ya hereni',
  searchPlaceholder: 'Tafuta jina au namba ya hereni',
  date: 'Tarehe',
  session: 'Kipindi',

  columns: {
    lead: '',
    session: 'Kipindi',
    cow: 'Ng’ombe',
    morning: 'Asubuhi',
    midday: 'Mchana',
    evening: 'Jioni',
    milker: 'Mkamuaji',
    litres: 'Lita',
    total: 'Jumla (L)',
    status: 'Hali',
    vsAvg: 'Dhidi ya wastani wa siku 7', // REVIEW
    recordedBy: 'Imerekodiwa na',
    actions: 'Vitendo',
  },
  recordedVia: { app: 'Programu', whatsapp: 'WhatsApp', import: 'Iliyoingizwa', system: 'Mfumo' }, // REVIEW
  showing: (shown, total) => (total == null
    ? `Rekodi ${shown}`
    : `Inaonyesha ${shown} kati ya ${total}`), // REVIEW
  sessions: { morning: 'Asubuhi', afternoon: 'Mchana', evening: 'Jioni', unknown: 'Haijulikani' },
  allSessions: 'Vipindi vyote', // REVIEW
  filtersTitle: 'Tafuta na uchuje rekodi za maziwa', // REVIEW
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

  tiles: {
    label: 'Jumla za maziwa',
    totalVolume: 'Jumla ya Maziwa',
    verified: 'Zilizothibitishwa',
    pending: 'Zinazosubiri',
    flagged: 'Zilizoalamishwa', // REVIEW
  },

  group: {
    noun: ['rekodi', 'rekodi'],
    entries: (_count, formatted) => `rekodi ${formatted}`,
    // Same number for one or many in Kiswahili; the count is kept so the signature matches English.
    // eslint-disable-next-line no-unused-vars
    entriesWord: (_count) => 'rekodi',
    describe: (litres) => litres,
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

  // Orodha ya rekodi kwenye simu.
  phone: {
    today: 'Leo',
    atAvg: 'wastani', // REVIEW
    drop: 'kushuka', // REVIEW
    higher: 'juu',
    lower: 'chini',
    rowLabel: ({ cow, litres, session, time, status }) => [cow, `lita ${litres}`, session, time, status].filter(Boolean).join(', '),
    noMatch: 'Hakuna rekodi zinazolingana na vichujio hivi', // REVIEW
    clearFilters: 'Ondoa vichujio', // REVIEW
    sheetLabel: 'Maelezo ya rekodi ya maziwa', // REVIEW
    close: 'Funga',
    yield: 'Mavuno', // REVIEW
    vsAvg: (avg) => `dhidi ya wastani wa siku 7: ${avg}`, // REVIEW
    status: 'Hali',
    sessionLabel: 'Kipindi',
    milkedBy: 'Amekamua', // REVIEW
    recordedBy: 'Ameandika', // REVIEW
    sameAsMilker: 'Aliyekamua', // REVIEW
    recordedAt: 'Iliandikwa', // REVIEW
    editRecord: 'Hariri rekodi',
    verify: 'Thibitisha rekodi',
    history: 'Historia ya maziwa',
    deleteRecord: 'Futa rekodi',
  },

  calves: {
    title: 'Maziwa ya ndama ya karibuni', // REVIEW
    totals: (_count, formattedCount, litres) => `Ulishaji ${formattedCount} · ${litres} yametolewa`, // REVIEW
    viewAll: 'Ona zote',
    loading: 'Inapakia ulishaji wa ndama…',
    failed: 'Imeshindwa kupakia ulishaji wa ndama.',
    empty: 'Hakuna ulishaji wa ndama uliorekodiwa.',
    date: 'Tarehe',
    calf: 'Ndama',
    litres: 'Maziwa Yaliyotumika', // REVIEW
    notes: 'Maelezo',
  },
};
