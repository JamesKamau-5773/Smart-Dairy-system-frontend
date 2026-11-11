/**
 * Kiswahili for failed requests (keys as errors.en.js; anything missing falls back to English).
 * Lines marked REVIEW need checking by a native speaker before release.
 */
export const errorsCopy = {
  network: 'Hatukuweza kufikia seva. Angalia mtandao wako ujaribu tena.',
  generic: 'Kuna tatizo. Tafadhali jaribu tena.',
  fallback: 'Haikuweza kukamilika. Tafadhali jaribu tena baadaye kidogo.',
  server: 'Huduma haipatikani kwa muda. Tafadhali jaribu tena baadaye kidogo.',
  validation: 'Baadhi ya taarifa hazipo au zinahitaji kurekebishwa. Angalia sehemu za fomu ujaribu tena.',
  conflict: 'Tayari kuna rekodi yenye taarifa hizi. Angalia rekodi zilizopo ujaribu tena.',
  unauthenticated: 'Huenda muda wako wa kuingia umeisha. Ingia tena, kisha ujaribu tena.',
  forbidden: 'Huna ruhusa ya kufanya hivyo. Hakikisha uko kwenye shamba sahihi au mwulize msimamizi wa shamba.',
  notFound: 'Huenda kitu hiki hakipo tena. Onyesha upya ukurasa ujaribu tena.', // REVIEW: "refresh"
  rateLimited: 'Majaribio mengi sana. Subiri kidogo, kisha ujaribu tena.',

  codes: {
    DUPLICATE_MILK_ENTRY: 'Ng’ombe huyu tayari ana rekodi ya maziwa ya tarehe na kipindi hicho. Hariri rekodi hiyo badala yake.',
    INSUFFICIENT_STOCK: 'Hakuna akiba ya kutosha. Ongeza akiba au tumia kiasi kidogo.',
    ITEM_IN_USE: 'Bidhaa hii inatumika kwenye michanganyiko, bechi au historia ya akiba, kwa hiyo haiwezi kufutwa. Iweke kando badala yake.', // REVIEW: "archive"
    ATTACHMENT_LIMIT: 'Rekodi hii tayari ina picha nyingi zaidi za risiti zinazoruhusiwa. Ondoa moja kuongeza nyingine.',
    EMPLOYEE_OFFBOARDED: 'Huwezi kumpa mkopo mtu aliyekwisha ondoka.', // REVIEW: "advance"
    ALREADY_OFFBOARDED: 'Mfanyakazi huyu tayari ameondoka.',
    LOAN_OUTSTANDING: 'Mfanyakazi huyu bado anadaiwa mkopo. Rekodi malipo, au uyakate kwenye mshahara wa mwisho, kabla hajaondoka.', // REVIEW
    PAYROLL_NOT_FINALIZED: 'Hati za mishahara zitapatikana mishahara ikishakamilishwa.', // REVIEW: "payslips"
    BALANCE_CHANGE_REQUIRES_ADVANCE: 'Badilisha salio la mkopo kwa kutoa mkopo au kurekodi malipo.', // REVIEW
    STOCK_CHANGE_REQUIRES_MOVEMENT: 'Akiba inabadilika kupitia Ongeza Akiba, Tumia au Hesabu ya Akiba tu, ili kila badiliko lirekodiwe.', // REVIEW
    PHONE_VERIFICATION_REQUIRED: 'Thibitisha namba yako ya simu kuendelea.',
    PASSWORD_RESET_REQUIRED: 'Weka nenosiri jipya kuendelea.',
    IDEMPOTENCY_IN_PROGRESS: 'Bado inahifadhiwa. Subiri kidogo kabla ya kujaribu tena.',
    IDEMPOTENCY_KEY_REUSED: 'Taarifa zilibadilika wakati uhifadhi wa kwanza ukiendelea kutumwa. Angalia rekodi, kisha uhifadhi tena.',
    INVALID_IDEMPOTENCY_KEY: 'Haikuweza kuhifadhiwa. Tafadhali jaribu tena.',
    RATE_LIMITED: 'Majaribio mengi sana. Subiri kidogo, kisha ujaribu tena.',
  },

  plan: {
    PLAN_LIMIT_REACHED: 'Kikomo cha mpango wako kwa hili kimefikiwa. Boresha mpango wako ili kuongeza zaidi. Ulichokwisha hifadhi hakiathiriwi.', // REVIEW: "boresha" = upgrade
    planLimitFor: (limit, resource) => `Mpango wako unaruhusu ${resource} ${limit}. Boresha mpango wako ili kuongeza zaidi. Ulichokwisha hifadhi hakiathiriwi.`, // REVIEW: resource name arrives in English
    FEATURE_NOT_IN_PLAN: 'Hili halimo kwenye mpango wako. Boresha mpango wako ili ulitumie.', // REVIEW
    SUBSCRIPTION_EXPIRED: 'Usajili wako umeisha, kwa hiyo hili halikuhifadhiwa. Uhuishe ili uendelee kurekodi. Rekodi zako ziko salama.', // REVIEW
    DEMO_READ_ONLY: 'Hili ni shamba la majaribio, kwa hiyo badiliko hili haliwezi kuhifadhiwa. Fungua akaunti ya shamba lako ili kuhifadhi rekodi.',
  },

  offline: {
    queued: 'Imehifadhiwa kwenye simu hii. Itatumwa ukirudi mtandaoni.',
    failed: (whatDidNotHappen) => `Hakuna mtandao. ${whatDidNotHappen} Jaribu tena ukirudi mtandaoni.`,
  },

  fieldReasons: {
    required: 'Hii inahitajika.',
    invalid: 'Angalia thamani hii.',
    too_long: 'Hii ni ndefu mno.',
    too_short: 'Hii ni fupi mno.',
    too_large: 'Hii ni kubwa mno.',
    too_small: 'Hii ni ndogo mno.',
    must_be_positive: 'Weka namba iliyo juu ya 0.',
    in_future: 'Tarehe hii haiwezi kuwa ya baadaye.',
    duplicate: 'Hii tayari inatumika.',
    not_found: 'Hii haipo tena. Chagua nyingine.',
  },
  checkField: 'Angalia sehemu hii.',
};
