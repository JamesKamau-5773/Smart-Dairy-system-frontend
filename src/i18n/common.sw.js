/**
 * Kiswahili for the shared building blocks. Same keys as common.en.js; anything missing falls
 * back to English. Pages pass in their own nouns, so list sentences put the noun after a colon
 * or at the end, where it needs no agreement. Lines marked REVIEW need a native speaker's check.
 */
const changes = (count) => (count === 1 ? 'Badiliko 1' : `Mabadiliko ${count}`);

export const commonCopy = {
  confirm: {
    title: 'Thibitisha',
    message: 'Una uhakika unataka kuendelea?',
    confirm: 'Thibitisha',
    cancel: 'Ghairi',
    pleaseWait: 'Subiri kidogo…',
    typeBefore: 'Andika',
    typeAfter: 'ili kuthibitisha',
  },

  density: {
    soft: 'Laini', // REVIEW: "soft" typography
    softHint: 'Maandishi laini',
    dense: 'Kubana', // REVIEW: "dense" typography
    denseHint: 'Maandishi yaliyobana (yanaonekana zaidi)', // REVIEW
  },

  modal: {
    close: 'Funga',
  },

  draft: {
    restored: 'Tumerudisha ulichokuwa ukiandika kabla programu haijafungwa.',
    startOver: 'Anza upya',
    ok: 'Sawa',
  },

  session: {
    title: 'Tafadhali ingia tena',
    message: 'Kwa usalama wako umetolewa. Ulichoandika kwenye ukurasa huu kimehifadhiwa. Ingia, kisha bonyeza Hifadhi tena.',
    identifier: 'Jina la mtumiaji au namba ya simu',
    password: 'Nenosiri',
    missing: 'Weka jina la mtumiaji au namba ya simu, na nenosiri lako.',
    pending: (count) => `${changes(count)} ${count === 1 ? 'linasubiri' : 'yanasubiri'} kutumwa. Ingia ili ${count === 1 ? 'litumwe' : 'yatumwe'}; ukitoka, ${count === 1 ? 'litabaki' : 'yatabaki'} kwenye simu hii hadi utakapoingia tena hapa.`, // REVIEW
    signingIn: 'Inaingia…',
    signIn: 'Ingia uendelee',
    signOut: 'Toka badala yake',
  },

  queue: {
    title: 'Mabadiliko yaliyohifadhiwa kwenye simu hii',
    intro: 'Mabadiliko yaliyohifadhiwa kwenye simu hii hutumwa yenyewe mtandao ukirudi.',
    empty: 'Kila kitu kimetumwa.',
    kinds: {
      milk: 'Rekodi ya maziwa',
      inventory: 'Badiliko la stoo', // REVIEW
      customer: 'Rekodi ya mnunuzi',
      staff: 'Rekodi ya mfanyakazi',
      finance: 'Rekodi ya fedha',
      other: 'Badiliko lililohifadhiwa',
    },
    rejected: (detail) => `Badiliko hili halikukubaliwa. ${detail} Rekebisha taarifa kwenye ukurasa husika, kisha ondoa nakala hii ikiwa huihitaji tena.`,
    removeQuestion: 'Ondoa badiliko hili ambalo halijatumwa?',
    keep: 'Acha',
    remove: 'Ondoa',
    removeLabel: (kind) => `Ondoa: ${kind}`,
    removeHint: 'Ondoa badiliko ambalo halijatumwa',
    close: 'Funga',
    sending: 'Inatuma…',
    sendNow: 'Tuma sasa',
  },

  list: {
    tryAgain: 'Jaribu tena',
    offlineTitle: (label) => `Huna mtandao, na bado hakuna kilichohifadhiwa kwenye simu hii: ${label}.`, // REVIEW
    offlineDetail: 'Zitapakia zenyewe mtandao ukirudi.',
    errorTitle: (label) => `Imeshindwa kupakia: ${label}.`,
    errorDetail: 'Angalia mtandao wako ujaribu tena.',
    stale: (label) => `Inaonyesha zilizohifadhiwa kwenye simu hii: ${label}. Imeshindwa kusasisha:`,
    staleDetail: 'angalia mtandao wako.',
    statUnavailable: (label) => `Haipatikani hadi zipakie: ${label}`,
    slow: (label) => `Bado inapakia: ${label}. Mtandao wako unaonekana kuwa wa polepole. Zitaonekana mara zitakapofika.`,
  },

  filters: {
    remove: (label) => `Ondoa kichujio ${label}`,
    reset: 'Futa vichujio',
    filters: 'Vichujio',
    all: 'Zote',
  },

  summary: {
    offline: 'Huna mtandao na jumla hizi bado hazijahifadhiwa kwenye simu hii. Zitapakia mtandao ukirudi.',
    loadFailed: 'Imeshindwa kupakia jumla.',
    refreshFailed: 'Imeshindwa kusasisha.',
    checkConnection: 'Angalia mtandao wako.',
    asOf: (time) => `Hadi saa ${time}`,
    scope: (label) => `Jumla za ${label}`,
    thisMonth: (range) => `mwezi huu, ${range}`,
    fullReport: 'Ona ripoti kamili',
    dates: 'Tarehe',
  },

  groups: {
    totalsUnavailable: 'jumla hazipatikani',
    countUnavailable: 'idadi haipatikani',
    totalsFailed: 'Jumla za makundi zimeshindwa kupakia, kwa hivyo vichwa vinaonyesha —.',
    ungrouped: 'Kundi la tarehe halipatikani',
    emptyDay: 'Hakuna rekodi zilizopakiwa kwa siku hii.',
  },
};
