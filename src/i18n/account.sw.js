/** Kiswahili text for the profile page (keys as in account.en.js). */
export const accountCopy = {
  title: 'Wasifu wangu', // REVIEW
  menuLink: 'Wasifu wangu', // REVIEW
  loading: 'Inapakia wasifu wako…', // REVIEW
  loadFailed: 'Hatukuweza kupakia wasifu wako.', // REVIEW
  retry: 'Jaribu tena', // REVIEW
  memberSince: (date) => `Mwanachama tangu ${date}`, // REVIEW
  demoNotice: 'Hili ni shamba la majaribio. Fungua akaunti bure ili ubadilishe wasifu au nenosiri.', // REVIEW

  details: {
    title: 'Taarifa zako', // REVIEW
    edit: 'Hariri', // REVIEW
    cancel: 'Ghairi', // REVIEW
    save: 'Hifadhi mabadiliko', // REVIEW
    saving: 'Inahifadhi…', // REVIEW
    saved: 'Taarifa zako zimehifadhiwa.', // REVIEW
    nothingChanged: 'Hakuna kilichobadilika.', // REVIEW
    name: 'Jina kamili', // REVIEW
    username: 'Jina la kuingia', // REVIEW
    phone: 'Nambari ya simu', // REVIEW
    phoneHint: 'Nambari mpya lazima ithibitishwe kabla ya kuitumia kuingia.', // REVIEW
    email: 'Barua pepe', // REVIEW
    emailHint: 'Acha wazi ili kuiondoa. Barua pepe mpya hupokea kiungo cha kuthibitisha.', // REVIEW
    farmLocation: 'Mahali shamba lilipo', // REVIEW
    farmLocationPlaceholder: 'mf. Kaunti ya Nakuru', // REVIEW
    notSet: 'Haijaongezwa', // REVIEW
    verified: 'Imethibitishwa', // REVIEW
    unverified: 'Haijathibitishwa', // REVIEW
    verifyPhone: 'Thibitisha simu', // REVIEW
    sendEmailLink: 'Tuma kiungo cha kuthibitisha', // REVIEW
    sendingEmailLink: 'Inatuma…', // REVIEW
    emailLinkSent: (email) => `Tumetuma kiungo cha kuthibitisha kwa ${email}.`, // REVIEW
    emailLinkFailed: 'Hatukuweza kutuma kiungo. Jaribu tena baadaye.', // REVIEW
    emailChanged: (email) => `Taarifa zako zimehifadhiwa. Tumetuma kiungo cha kuthibitisha kwa ${email}.`, // REVIEW
    errors: {
      PHONE_IN_USE: 'Akaunti nyingine tayari inatumia nambari hii ya simu.', // REVIEW
      EMAIL_IN_USE: 'Akaunti nyingine tayari inatumia barua pepe hii.', // REVIEW
      INVALID_PHONE: 'Weka nambari ya simu ya Kenya, kwa mfano 0712 345 678.', // REVIEW
      nameTooLong: 'Tumia herufi 120 au chache.', // REVIEW
      farmLocationTooLong: 'Tumia herufi 150 au chache.', // REVIEW
    },
    saveFailed: 'Hatukuweza kuhifadhi taarifa zako. Zikague kisha ujaribu tena.', // REVIEW
  },

  staff: {
    title: 'Rekodi ya mfanyakazi', // REVIEW
    hint: 'Shamba lako linatunza rekodi hii. Mwombe mwenye shamba aibadilishe.', // REVIEW
    fullName: 'Jina kwenye orodha ya wafanyakazi', // REVIEW
    jobTitle: 'Kazi', // REVIEW
    hireDate: 'Alianza', // REVIEW
    status: 'Hali', // REVIEW
  },

  password: {
    changeTitle: 'Badilisha nenosiri', // REVIEW
    setTitle: 'Weka nenosiri', // REVIEW
    setIntro: 'Unaingia kwa Google. Weka nenosiri ili pia uingie kwa nambari ya simu au barua pepe.', // REVIEW
    current: 'Nenosiri la sasa', // REVIEW
    new: 'Nenosiri jipya', // REVIEW
    confirm: 'Thibitisha nenosiri jipya', // REVIEW
    submitChange: 'Badilisha nenosiri', // REVIEW
    submitSet: 'Weka nenosiri', // REVIEW
    saving: 'Inahifadhi…', // REVIEW
    changed: 'Nenosiri limebadilishwa. Umetolewa kwenye vifaa vingine.', // REVIEW
    set: 'Nenosiri limewekwa. Umetolewa kwenye vifaa vingine.', // REVIEW
    errors: {
      currentRequired: 'Weka nenosiri lako la sasa.', // REVIEW
      currentInvalid: 'Hilo si nenosiri lako la sasa.', // REVIEW
      newRequired: 'Weka nenosiri jipya.', // REVIEW
      unchanged: 'Chagua nenosiri tofauti na la sasa.', // REVIEW
      mismatch: 'Manenosiri hayalingani.', // REVIEW
      weak: 'Chagua nenosiri lenye nguvu zaidi.', // REVIEW
      failed: 'Hatukuweza kubadilisha nenosiri lako. Jaribu tena.', // REVIEW
    },
  },
};
