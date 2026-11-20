/**
 * Kiswahili for the sign-in, sign-up, verification and password recovery flows. Same keys as
 * auth.en.js; any key missing here falls back to English. Lines marked REVIEW need checking by a
 * native speaker before release.
 */
export const authCopy = {
  common: {
    brand: 'Maziwa Smart',
    or: 'au',
    logIn: 'Ingia',
    createAccount: 'Fungua akaunti',
    continue: 'Endelea',
    tryAgain: 'Jaribu tena',
    backToLogin: 'Rudi kuingia',
    copy: 'Nakili',
    copied: 'Imenakiliwa',
    working: 'Tafadhali subiri…',
    waitSeconds: (seconds) => `Jaribu tena baada ya sekunde ${seconds}`,
  },

  fields: {
    phone: 'Namba ya simu',
    phonePlaceholder: 'mf. 0712 345 678',
    phoneHint: 'Namba ya Kenya, 07… au +254…',
    phoneInvalid: 'Weka namba ya simu ya Kenya, kwa mfano 0712 345 678.',
    email: 'Barua pepe',
    emailOptional: 'Barua pepe (si lazima)',
    emailPlaceholder: 'mf. jane@example.com',
    emailHint: 'Inakuwezesha kubadilisha nenosiri kupitia barua pepe.',
    emailInvalid: 'Weka barua pepe sahihi, kwa mfano jane@example.com.',
    password: 'Nenosiri',
    newPassword: 'Nenosiri jipya',
    confirmPassword: 'Thibitisha nenosiri jipya',
    passwordRequired: 'Weka nenosiri lako.',
    showPassword: 'Onyesha nenosiri',
    hidePassword: 'Ficha nenosiri',
    passwordMismatch: 'Manenosiri hayafanani.',
    farmName: 'Jina la shamba',
    farmNamePlaceholder: 'mf. Bahati Dairies',
    farmNameRequired: 'Weka jina la shamba lako.',
    fullName: 'Jina kamili',
    fullNameRequired: 'Weka jina lako kamili.',
    yourName: 'Jina lako',
  },

  password: {
    rules: {
      min_length: 'Angalau herufi 8',
      max_length: 'Si zaidi ya herufi 128',
      letter_and_digit: 'Angalau herufi moja na namba moja',
      not_personal: 'Lisiwe na namba yako ya simu, barua pepe au jina la mtumiaji',
      not_common: 'Lisiwe nenosiri linalotumiwa na watu wengi',
    },
    errors: {
      min_length: 'Tumia angalau herufi 8.',
      max_length: 'Tumia herufi 128 au chache.',
      letter_and_digit: 'Weka angalau herufi moja na namba moja.',
      not_personal: 'Usitumie namba ya simu, barua pepe au jina la mtumiaji kwenye nenosiri.',
      not_common: 'Nenosiri hilo ni la kawaida sana. Chagua jingine.',
    },
    strengthLabel: 'Uimara wa nenosiri',
    strength: {
      empty: '',
      weak: 'Dhaifu',
      fair: 'Wastani',
      strong: 'Imara',
    },
    hint: 'Tumia herufi 8 au zaidi, zenye herufi na namba.',
  },

  login: {
    title: 'Ingia kwenye shamba lako',
    titleReturning: 'Karibu tena',
    subtitle: 'Tumia namba yako ya simu au barua pepe.',
    subtitleReturning: 'Karibu tena. Weka nenosiri lako kufungua shamba lako.',
    identifier: 'Simu au barua pepe',
    identifierPlaceholder: 'mf. 0712 345 678',
    identifierRequired: 'Weka namba yako ya simu au barua pepe.',
    notYou: 'Si wewe?',
    forgotPassword: 'Umesahau nenosiri?',
    submit: 'Ingia',
    submitting: 'Inaingia…',
    errorTitle: 'Imeshindikana kuingia',
    newHere: 'Mgeni hapa?',
    createFarmAccount: 'Fungua akaunti ya shamba lako',
    passwordUpdated: 'Nenosiri limebadilishwa. Ingia kwa nenosiri jipya.',
  },

  google: {
    continue: 'Endelea na Google',
    redirecting: 'Inafungua Google…',
    completing: 'Inakuingiza kwa Google…',
    signupTitle: 'Maliza kuweka shamba lako',
    signupSubtitle: (email) => `Umeingia kwa Google kama ${email}. Ongeza shamba lako na namba ya simu ili kuendelea.`,
    signupSubmit: 'Fungua akaunti ya shamba',
    signupSubmitting: 'Inafungua akaunti yako…',
    signupLoading: 'Inapakia taarifa zako za Google…',
    signupErrorTitle: 'Imeshindikana kufungua akaunti',
    linkRequiredTitle: 'Ingia kwa simu kwanza',
    linkRequired: 'Kuna akaunti tayari inayotumia barua pepe hii. Ingia kwa namba ya simu na nenosiri, kisha unganisha Google kwenye Mipangilio.',
    linkedTitle: 'Google imeunganishwa',
    linked: 'Sasa unaweza kuingia kwa Google.',
    errorTitle: 'Kuingia kwa Google hakukufanikiwa',
    signupExpired: 'Kuingia kwa Google kumechukua muda mrefu. Tafadhali endelea na Google tena.',
    errors: {
      GOOGLE_CANCELLED: 'Kuingia kwa Google kumesitishwa.',
      GOOGLE_STATE_MISMATCH: 'Jaribio hilo la kuingia limepitwa na muda. Tafadhali endelea na Google tena.',
      GOOGLE_EMAIL_UNVERIFIED: 'Barua pepe yako ya Google bado haijathibitishwa. Ithibitishe kwa Google, au ingia kwa namba ya simu.',
      GOOGLE_ALREADY_LINKED: 'Akaunti hii ya Google tayari imeunganishwa na akaunti nyingine ya Maziwa Smart.',
      ACCOUNT_DISABLED: 'Akaunti hii imezimwa. Wasiliana na mwenye shamba au msimamizi.',
      GOOGLE_UNAVAILABLE: 'Kuingia kwa Google hakupatikani kwa sasa. Ingia kwa namba ya simu badala yake.',
      default: 'Kuna tatizo na kuingia kwa Google. Tafadhali jaribu tena.',
    },
  },

  register: {
    title: 'Fungua akaunti ya shamba lako',
    subtitle: 'Taarifa chache tu, na unaweza kurekodi ukamuaji wako wa kwanza leo.', // REVIEW: "ukamuaji" for a milking
    ownerTitle: 'Weka mmiliki wa mfumo', // REVIEW
    ownerSubtitle: 'Kwa wamiliki wa mfumo wanaoaminika tu. Msimbo wako wa kuweka unakaguliwa kabla akaunti haijafunguliwa.', // REVIEW
    phoneHint: 'Utaingia kwa namba hii. 07… au +254… zote zinafanya kazi.',
    setupCode: 'Msimbo wa kuweka mmiliki', // REVIEW
    setupCodeHint: 'Hutolewa na msimamizi wa mfumo.',
    setupCodeRequired: 'Weka msimbo wa kuweka mmiliki kutoka kwa msimamizi wa mfumo.', // REVIEW
    submit: 'Fungua akaunti ya shamba',
    submitOwner: 'Fungua akaunti ya mmiliki',
    submitting: 'Inafungua akaunti yako…',
    welcome: (name) => `Karibu, ${name}!`,
    errorTitle: 'Imeshindikana kufungua akaunti',
    inviteNote: 'Unajiunga na chama cha ushirika au timu ya shamba? Fungua kiungo cha mwaliko ulichotumiwa badala yake. Kinakuwekea akaunti yako.',
    haveAccount: 'Tayari una akaunti?',
  },

  verifyPhone: {
    title: 'Thibitisha namba yako ya simu',
    titleAdd: 'Ongeza namba yako ya simu',
    subtitle: 'Tunathibitisha namba yako kupitia WhatsApp. Ni ujumbe mmoja tu, na unalinda akaunti yako.',
    subtitleAdd: 'Akaunti ya shamba lako inahitaji namba ya simu. Tutaithibitisha kupitia WhatsApp.',
    numberLabel: 'Tutathibitisha',
    changeNumber: 'Badilisha namba',
    submitPhone: 'Endelea',
    starting: 'Inapata msimbo wako…',
    step1: 'Gusa kitufe kufungua WhatsApp ukiwa na msimbo wako tayari.',
    step2: 'Bonyeza tuma kwenye WhatsApp, kisha urudi hapa.',
    codeLabel: 'Msimbo wako',
    codeManual: (number) => `Au tuma msimbo huu kwa WhatsApp kwenda ${number}.`,
    openWhatsApp: 'Thibitisha kupitia WhatsApp',
    openAgain: 'Fungua WhatsApp tena',
    waiting: 'Inasubiri ujumbe wako wa WhatsApp…',
    waitingHint: 'Ukurasa huu utajisasisha wenyewe tukishaupokea.',
    expiresIn: (time) => `Msimbo unaisha baada ya ${time}`,
    checkNow: 'Nimeutuma, angalia sasa',
    resend: 'Pata msimbo mpya',
    resendIn: (seconds) => `Pata msimbo mpya baada ya sekunde ${seconds}`,
    verifiedTitle: 'Simu imethibitishwa',
    verified: 'Asante! Namba yako ya simu imethibitishwa.',
    expiredTitle: 'Msimbo umeisha muda',
    expired: 'Msimbo unafanya kazi kwa dakika 10 tu. Pata mpya ujaribu tena.',
    lockedTitle: 'Misimbo mingi sana isiyo sahihi',
    locked: 'Tumepokea misimbo mingi isiyo sahihi kutoka kwa namba yako. Pata msimbo mpya ujaribu tena.',
    cancelledTitle: 'Msimbo mpya umeombwa',
    cancelled: 'Msimbo wa mwisho tu ndio unaofanya kazi. Pata msimbo mpya kuendelea.',
    startAgain: 'Pata msimbo mpya',
    offlinePaused: 'Huna mtandao. Tutaendelea kuangalia ukirudi mtandaoni.',
    errorTitle: 'Imeshindikana kuthibitisha simu yako',
    signOut: 'Toka',
    later: 'Fanya hivi baadaye',
  },

  phoneBanner: {
    titleAdd: 'Ongeza namba yako ya simu',
    titleVerify: 'Thibitisha namba yako ya simu',
    messageAdd: 'Ongeza namba ya simu ili uweze kuingia na kubadilisha nenosiri kupitia WhatsApp.',
    messageVerify: 'Thibitisha namba yako kupitia WhatsApp ili uweze kurejesha akaunti yako wakati wowote.',
    actionAdd: 'Ongeza simu',
    actionVerify: 'Thibitisha sasa',
  },

  forgot: {
    title: 'Badilisha nenosiri lako',
    subtitle: 'Chagua jinsi ungependa kupata kiungo cha kubadilisha.',
    channelLabel: 'Nitumie kiungo kupitia',
    whatsapp: 'WhatsApp',
    email: 'Barua pepe',
    submit: 'Endelea',
    submitting: 'Inatuma…',
    sentTitle: 'Angalia ujumbe wako',
    neutral: 'Kama akaunti ipo, tumetuma maelekezo.',
    whatsappStep1: 'Gusa kitufe kufungua WhatsApp ukiwa na msimbo wako tayari.',
    whatsappStep2: 'Utume kutoka kwa namba ya WhatsApp iliyo kwenye akaunti yako. Tutajibu na kiungo cha kubadilisha.',
    whatsappStep3: 'Fungua kiungo tutakachojibu nacho uweke nenosiri jipya.',
    openWhatsApp: 'Tuma msimbo kwa WhatsApp',
    emailSent: 'Kama kuna akaunti yenye barua pepe iliyothibitishwa, tumetuma kiungo cha kubadilisha. Kinafanya kazi kwa dakika 10.',
    expiresIn: (time) => `Msimbo unaisha baada ya ${time}`,
    sendAgain: 'Tuma tena',
    useOther: 'Tumia namba au barua pepe nyingine',
    errorTitle: 'Imeshindikana kutuma kiungo',
    noChannels: 'Kubadilisha nenosiri hakupatikani kwa sasa.',
    adminHint: 'Wafanyakazi wanaweza pia kumwomba mwenye shamba au msimamizi awabadilishie nenosiri.',
    remembered: 'Umekumbuka?',
  },

  reset: {
    title: 'Weka nenosiri jipya',
    subtitle: 'Chagua nenosiri ambalo hujawahi kutumia hapa.',
    checking: 'Inakagua kiungo chako…',
    invalidTitle: 'Kiungo hiki kimeisha muda',
    invalid: 'Viungo vya kubadilisha vinafanya kazi mara moja tu na kwa dakika 10. Omba kipya kuendelea.',
    requestNew: 'Omba kiungo kipya',
    submit: 'Hifadhi nenosiri jipya',
    submitting: 'Inahifadhi…',
    errorTitle: 'Imeshindikana kuhifadhi nenosiri',
  },

  verifyEmail: {
    checking: 'Inathibitisha barua pepe yako…',
    successTitle: 'Barua pepe imethibitishwa',
    success: 'Asante! Sasa unaweza kubadilisha nenosiri kupitia barua pepe.',
    invalidTitle: 'Kiungo hiki kimeisha muda',
    invalid: 'Viungo vya kuthibitisha vinafanya kazi mara moja tu na kwa dakika 10. Unaweza kuomba kipya kwenye Mipangilio.',
    continueApp: 'Endelea kwenye shamba lako',
  },

  demo: {
    starting: 'Tunaanzisha shamba lako la majaribio…', // REVIEW
    ready: 'Shamba lako la majaribio liko tayari.', // REVIEW
    readyFor: (minutes) => `Shamba lako la majaribio liko tayari. Una dakika ${minutes} za kulitazama.`, // REVIEW
    failedTitle: 'Shamba la majaribio halikuanza', // REVIEW
    retry: 'Jaribu tena',
    createFarm: 'Fungua shamba lako bure', // REVIEW
    backHome: 'Rudi mwanzo', // REVIEW
  },

  errors: {
    network: 'Hatukuweza kuunganisha. Angalia mtandao wako ujaribu tena.',
    offline: 'Huna mtandao. Unganisha kwenye intaneti kuendelea.',
    rateLimited: 'Majaribio mengi sana. Subiri kidogo, kisha ujaribu tena.',
    rateLimitedFor: (seconds) => `Majaribio mengi sana. Jaribu tena baada ya sekunde ${seconds}.`,
    server: 'Hatukuweza kukamilisha hilo sasa hivi. Tafadhali jaribu tena baadaye kidogo.',
    validation: 'Baadhi ya taarifa zinahitaji kurekebishwa. Angalia sehemu zilizowekwa alama ujaribu tena.',
    codes: {
      INVALID_PHONE: 'Weka namba ya simu ya Kenya, kwa mfano 0712 345 678.',
      WEAK_PASSWORD: 'Chagua nenosiri imara zaidi.',
      INVALID_CREDENTIALS: 'Namba ya simu au barua pepe na nenosiri havilingani. Viangalie ujaribu tena. Kama ulialikwa, washa akaunti yako kupitia kiungo cha mwaliko kwanza.',
      ACCOUNT_DISABLED: 'Akaunti hii imezimwa. Wasiliana na mwenye shamba au msimamizi.',
      INVALID_FARM: 'Shamba hilo si sehemu ya akaunti yako.',
      PHONE_IN_USE: 'Akaunti nyingine tayari inatumia namba hii. Ingia badala yake, au tumia namba nyingine.',
      EMAIL_IN_USE: 'Akaunti nyingine tayari inatumia barua pepe hii. Ingia badala yake, au acha barua pepe wazi.',
      BOOTSTRAP_UNAVAILABLE: 'Uwekaji wa mwanzo wa mfumo haupatikani tena. Ingia kwa akaunti ya msimamizi wa mfumo.', // REVIEW
      INVALID_BOOTSTRAP_KEY: 'Msimbo wa kuweka mmiliki haukuweza kuthibitishwa. Angalia msimbo uliopewa na msimamizi wa mfumo ujaribu tena.', // REVIEW
      SIGNUP_SESSION_EXPIRED: 'Kuingia kwa Google kumechukua muda mrefu. Tafadhali endelea na Google tena.',
      PHONE_REQUIRED: 'Ongeza namba yako ya simu kuendelea.',
      PHONE_ALREADY_VERIFIED: 'Namba hii ya simu tayari imethibitishwa.',
      CHANNEL_DISABLED: 'Chaguo hilo halipatikani kwa sasa. Chagua jingine.',
      RESET_TOKEN_INVALID: 'Kiungo hiki cha kubadilisha si sahihi au kimeisha muda. Omba kipya.',
      PASSWORD_MISMATCH: 'Manenosiri hayafanani.',
      VERIFICATION_TOKEN_INVALID: 'Kiungo hiki cha kuthibitisha si sahihi au kimeisha muda.',
      NOT_FOUND: 'Hatukupata ombi hilo. Tafadhali anza tena.',
      UNAUTHENTICATED: 'Muda wako wa kuingia umeisha. Tafadhali ingia tena.',
      DEMO_UNAVAILABLE: 'Shamba la majaribio linaandaliwa. Tafadhali jaribu tena baada ya dakika moja.', // REVIEW
    },
    byFlow: {
      login: {
        unauthorized: 'Namba ya simu au barua pepe na nenosiri havilingani. Viangalie ujaribu tena. Kama ulialikwa, washa akaunti yako kupitia kiungo cha mwaliko kwanza.',
        server: 'Hatukuweza kukuingiza sasa hivi. Tafadhali jaribu tena baadaye kidogo.',
        fallback: 'Hatukuweza kukuingiza. Angalia namba ya simu au barua pepe na nenosiri, kisha ujaribu tena.',
      },
      register: {
        conflict: 'Huenda shamba au akaunti tayari inatumia taarifa hizi. Angalia namba ya simu, au ingia kama tayari una akaunti.',
        fallback: 'Hatukuweza kufungua akaunti. Angalia sehemu zote ujaribu tena. Tatizo likiendelea, wasiliana nasi.',
      },
      bootstrap: {
        unauthorized: 'Msimbo wa kuweka mmiliki haukuweza kuthibitishwa. Angalia msimbo uliopewa na msimamizi wa mfumo ujaribu tena.', // REVIEW
        unavailable: 'Uwekaji wa mwanzo wa mfumo haupatikani tena. Ingia kwa akaunti ya msimamizi wa mfumo.', // REVIEW
        fallback: 'Hatukuweza kukamilisha uwekaji wa mfumo. Angalia taarifa ujaribu tena.', // REVIEW
      },
      claim: {
        server: 'Hatukuweza kuwasha akaunti yako sasa hivi. Tafadhali jaribu tena baadaye kidogo.',
        fallback: 'Hatukuweza kuwasha akaunti yako. Fungua tena kiungo cha mwaliko na uangalie taarifa ulizoweka.',
      },
      passwordReset: {
        server: 'Hatukuweza kubadilisha nenosiri sasa hivi. Tafadhali jaribu tena baadaye kidogo.',
        fallback: 'Hatukuweza kubadilisha nenosiri. Angalia masharti ya nenosiri ujaribu tena.',
      },
      phoneVerification: {
        fallback: 'Hatukuweza kuanza kuthibitisha simu. Tafadhali jaribu tena.',
      },
      forgotPassword: {
        fallback: 'Hatukuweza kutuma kiungo cha kubadilisha. Tafadhali jaribu tena.',
      },
      googleSignup: {
        fallback: 'Hatukuweza kufungua akaunti yako. Angalia sehemu zote ujaribu tena.',
      },
      demo: {
        unavailable: 'Shamba la majaribio halipatikani sasa hivi. Unaweza kufungua shamba lako bure badala yake.', // REVIEW
        server: 'Hatukuweza kuanzisha shamba la majaribio sasa hivi. Tafadhali jaribu tena baadaye kidogo.', // REVIEW
        fallback: 'Hatukuweza kuanzisha shamba la majaribio. Tafadhali jaribu tena.', // REVIEW
      },
      default: {
        fallback: 'Hatukuweza kukamilisha ombi hilo. Tafadhali jaribu tena.',
      },
    },
    fieldLabels: {
      farm_name: 'Jina la shamba',
      full_name: 'Jina kamili',
      name: 'Jina',
      phone: 'Namba ya simu',
      phone_number: 'Namba ya simu',
      email: 'Barua pepe',
      login: 'Simu au barua pepe',
      username: 'Jina la mtumiaji',
      password: 'Nenosiri',
      confirm_password: 'Thibitisha nenosiri',
      bootstrap_key: 'Msimbo wa kuweka mmiliki', // REVIEW
      bootstrap_code: 'Msimbo wa kuweka mmiliki', // REVIEW
    },
    checkField: (label) => `Angalia sehemu ya ${label.toLowerCase()}.`,
  },

  layout: {
    offline: 'Huna mtandao. Unganisha kwenye intaneti kuendelea. Ukishaingia, programu inaendelea kufanya kazi bila mtandao.',
    benefitsLabel: 'Kwa nini wafugaji wanatumia Maziwa Smart',
    tagline: ['Kila lita.', 'Kila ng’ombe.', 'Kila shilingi.'],
    benefits: [
      'Rekodi maziwa ya kila ng’ombe kwa sekunde',
      'Usikose joto wala malipo', // REVIEW: "joto" for a cow on heat
      'Inafanya kazi hata bila mtandao',
    ],
  },
};
