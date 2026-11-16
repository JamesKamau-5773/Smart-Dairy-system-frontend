/**
 * Kiswahili for the app shell. Same keys as shell.en.js; anything missing falls back to English.
 * Lines marked REVIEW need checking by a native speaker before release.
 */

// "badiliko" (one change) / "mabadiliko" (changes), with matching agreement.
const saved = (count) => (count === 1 ? 'badiliko 1 lililohifadhiwa' : `mabadiliko ${count} yaliyohifadhiwa`); // REVIEW

export const shellCopy = {
  header: {
    openMenu: 'Fungua menyu',
    activeWorkspace: 'Shamba linalotumika',
    farmFallback: 'Shamba',
    userFallback: 'Mtumiaji',
    roleUnknown: 'Haijulikani',
    noRole: 'Hana jukumu',
    language: 'Lugha',
    density: 'Mpangilio wa skrini', // REVIEW: "interface density"
    dataSaver: 'Okoa data',
    dataSaverHint: 'Inaficha picha za ng’ombe hadi uziguse na inasasisha mara chache, ili kuokoa data ya simu.',
    signOut: 'Toka',
    accountMenu: (name) => `Akaunti na mipangilio, ${name}`,
    pendingTitle: 'Mabadiliko bado hayajatumwa',
    pendingMessage: (pending, online) => {
      const changes = pending === 1 ? 'Badiliko 1 lililohifadhiwa kwenye simu hii bado halijatumwa. ' : `Mabadiliko ${pending} yaliyohifadhiwa kwenye simu hii bado hayajatumwa. `; // REVIEW
      return changes
        + (online
          ? 'Endelea kuwa umeingia kwa muda mfupi ili yatumwe. '
          : 'Endelea kuwa umeingia na yatatumwa ukirudi mtandaoni. ')
        + 'Ukitoka, yatabaki kwenye simu hii na yatatumwa utakapoingia tena hapa.';
    },
    signOutAnyway: 'Toka hata hivyo',
    staySignedIn: 'Baki ndani',
    roles: {
      SUPER_ADMIN: 'Msimamizi wa mfumo',
      ADMIN: 'Msimamizi',
      COOPERATIVE_ADMIN: 'Msimamizi wa chama',
      COOP_ADMIN: 'Msimamizi wa chama',
      FARM_ADMIN: 'Msimamizi wa shamba',
      FARM_MANAGER: 'Meneja wa shamba',
      FARM_SUPERVISOR: 'Msimamizi wa kazi shambani', // REVIEW
      FARM_HAND: 'Mfanyakazi wa shamba',
      FARMER: 'Mkulima',
      CLERK: 'Karani',
      HERDSMAN: 'Mchungaji', // REVIEW: herdsman
      VETERINARY_DOCTOR: 'Daktari wa mifugo',
      VET_ASSISTANT: 'Msaidizi wa daktari wa mifugo',
    },
    titles: {
      dashboard: 'Dashibodi',
      production: 'Rekodi za Maziwa',
      buyers: 'Orodha ya Wanunuzi',
      ledger: 'Daftari la Hesabu',
      milkUsage: 'Matumizi ya Maziwa',
      feedMixing: 'Kuchanganya Chakula',
      clinical: 'Rekodi za Matibabu',
      stock: 'Bidhaa za Stoo', // REVIEW
    },
  },

  nav: {
    mainLabel: 'Menyu kuu',
    closeMenu: 'Funga menyu',
    toggleSection: (title) => `Fungua au funga sehemu ya ${title}`,
    groups: {
      platform: 'Mfumo',
      cooperative: 'Usimamizi wa Chama', // REVIEW: cooperative = chama cha ushirika
      operations: 'Shughuli za Kila Siku',
      herd: 'Mifugo',
      feeding: 'Ulishaji',
      finance: 'Fedha na Mauzo', // REVIEW: "Finance & Supply"
      reports: 'Ripoti',
      compliance: 'Usalama wa Maziwa', // REVIEW: "Compliance"
      hr: 'Wafanyakazi',
    },
    items: {
      systemAdmin: 'Dashibodi ya Msimamizi wa Mfumo',
      memberOnboarding: 'Kusajili Wanachama',
      commandCenter: 'Dashibodi',
      production: 'Rekodi za Maziwa',
      milkUsage: 'Matumizi ya Maziwa',
      dailyRoutine: 'Ratiba ya Kila Siku',
      farmTasks: 'Kazi za Shambani',
      cowRegister: 'Daftari la Ng’ombe',
      breeding: 'Uzalishaji na Vizazi', // REVIEW: "Breeding & Genetics"
      medical: 'Rekodi za Matibabu',
      milkDrops: 'Tahadhari za Maziwa Kupungua',
      todayFeeding: 'Ulishaji wa Leo',
      feedDashboard: 'Akiba ya Chakula na Gharama',
      feedMixes: 'Michanganyiko ya Chakula',
      ingredients: 'Viambato',
      milkLab: 'Mpango wa Maziwa ya Ndama', // REVIEW: "Milk Feeding Planner" (calves)
      unitHelpers: 'Vipimo vya Kienyeji', // REVIEW: local units such as kasuku, gorogoro
      buyers: 'Orodha ya Wanunuzi',
      customers: 'Wateja',
      inventory: 'Bidhaa za Stoo', // REVIEW
      ledger: 'Daftari la Hesabu',
      farmReports: 'Ripoti za Shamba',
      customerValue: 'Thamani na Faida ya Wateja',
      cowProfit: 'Faida ya Kila Ng’ombe',
      milkInventory: 'Ripoti ya Akiba ya Maziwa',
      safety: 'Usalama wa Maziwa',
      staff: 'Daftari la Wafanyakazi',
      payroll: 'Mishahara',
    },
  },

  bottomNav: {
    label: 'Menyu ya chini',
    dashboard: 'Dashibodi',
    production: 'Maziwa',
    buyers: 'Wanunuzi',
    ledger: 'Hesabu',
  },

  offline: {
    title: 'Huna mtandao.',
    body: 'Rekodi za maziwa na kazi nyingine za kila siku zinahifadhiwa kwenye simu hii na kutumwa ukirudi mtandaoni. Malipo na mishahara yanahitaji intaneti.',
    waiting: (count) => `${saved(count)} ${count === 1 ? 'linasubiri' : 'yanasubiri'} kutumwa.`, // REVIEW
    needsAttention: (count) => (count === 1
      ? 'Badiliko 1 lililohifadhiwa halikuweza kutumwa na linahitaji uangalizi wako.'
      : `Mabadiliko ${count} yaliyohifadhiwa hayakuweza kutumwa na yanahitaji uangalizi wako.`), // REVIEW
    sending: (count) => `Umerudi mtandaoni. Inatuma ${saved(count)}…`,
    queued: (count) => `Inasubiri kutuma ${saved(count)}…`,
    review: 'Angalia',
  },

  errorBoundary: {
    pageTitle: 'Ukurasa huu umeacha kufanya kazi',
    appTitle: 'Maziwa Smart imeacha kufanya kazi',
    message: 'Hili ni tatizo la programu, si kosa lako. Rekodi ulizohifadhi ziko salama, na chochote kilichohifadhiwa kwenye simu hii bado kitatumwa. Jaribu tena, au pakia upya programu.',
    tryAgain: 'Jaribu tena',
    reload: 'Pakia upya programu',
    keepsHappening: (phone) => `Hili linaendelea kutokea. Pakia upya programu, na ikiendelea, tupigie kwa ${phone}.`,
  },

  notFound: {
    title: 'Hatukupata ukurasa huo',
    message: 'Huenda kiungo ni cha zamani au kimeandikwa vibaya. Hakuna kilichobadilika kwenye shamba lako.',
    goToLogin: 'Nenda kuingia',
    goToDashboard: 'Nenda kwenye dashibodi yako',
    back: 'Rudi',
  },

  demo: {
    banner: 'Unatazama shamba la majaribio lenye data za mfano. Mabadiliko hayahifadhiwi.', // REVIEW
    endsIn: (time) => `Majaribio yanaisha baada ya ${time}`, // REVIEW
    minutes: (count) => `dak ${count}`, // REVIEW
    endingSoon: (minutes) => `Majaribio yako yanaisha baada ya dakika ${minutes}. Fungua shamba lako bure ili kuhifadhi rekodi zako.`, // REVIEW
    createFarm: 'Fungua shamba lako bure', // REVIEW
    logIn: 'Ingia',
    expiredTitle: 'Muda wa shamba la majaribio umeisha', // REVIEW
    expiredMessage: 'Vipindi vya majaribio ni vifupi. Anzisha majaribio tena, au fungua shamba lako bure ili kuhifadhi rekodi zako.', // REVIEW
    restart: 'Anzisha majaribio tena', // REVIEW
    restarting: 'Inaanzisha…', // REVIEW
    backHome: 'Rudi mwanzo', // REVIEW
  },

  plan: {
    lockedTitle: (feature) => `${feature} haimo kwenye mpango wako`,
    lockedNamedPlan: (plan, feature) => `Mpango wako wa ${plan} haujumuishi ${feature}.`,
    lockedPlan: (feature) => `Mpango wako haujumuishi ${feature}.`,
    lockedUpgrade: 'Boresha mpango wako ili uitumie. Rekodi zako haziathiriwi.', // REVIEW: "boresha" = upgrade
    seePlans: 'Angalia mipango na uboreshe', // REVIEW
    callToUpgrade: 'Kuboresha mpango, tupigie kwa', // REVIEW
    areas: {
      dashboard: 'Dashibodi',
      production: 'Rekodi za maziwa',
      tasks: 'Kazi za kila siku',
      herd: 'Daftari la ng’ombe',
      breeding: 'Uzalishaji',
      medical: 'Rekodi za afya',
      feeding: 'Ulishaji',
      feed: 'Chakula na lishe',
      customers: 'Wanunuzi',
      finance: 'Daftari la hesabu',
      inventory: 'Bidhaa za stoo', // REVIEW
      reports: 'Ripoti',
      safety: 'Usalama wa maziwa',
      staff: 'Wafanyakazi',
      payroll: 'Mishahara',
      member_admin: 'Kusajili wanachama',
    },
  },
};
