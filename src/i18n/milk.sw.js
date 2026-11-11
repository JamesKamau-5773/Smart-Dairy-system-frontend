/**
 * Kiswahili for the milk record form (keys as milk.en.js; anything missing falls back to English).
 * Lines marked REVIEW need checking by a native speaker before release.
 */
export const milkCopy = {
  titleCreate: 'Rekodi Maziwa',
  titleEdit: 'Hariri Rekodi ya Maziwa',
  subtitleCreate: 'Rekodi maziwa kwa lita',
  subtitleEdit: 'Badilisha taarifa za rekodi ya maziwa',
  bannerTitle: 'Rekodi ya Haraka',
  close: 'Funga',
  back: 'Rudi',
  cow: 'Ng’ombe',
  selectCow: 'Chagua Ng’ombe',
  chooseCow: 'Chagua ng’ombe...',
  moveCowHint: 'Kuhamisha maziwa haya kwa ng’ombe mwingine, futa rekodi hii kisha uirekodi tena kwa ng’ombe sahihi.',
  date: 'Tarehe',
  session: 'Kipindi',
  sessions: { morning: 'asubuhi', midday: 'mchana', evening: 'jioni' },
  onMedication: 'Ng’ombe yuko kwenye dawa! Usichanganye maziwa haya.',
  volume: 'Kiasi (Lita)',
  cancel: 'Ghairi',
  deleteRecord: 'Futa Rekodi',
  deleting: 'Inafuta...',
  saving: 'Inahifadhi...',
  update: 'Hifadhi Mabadiliko',
  save: 'Hifadhi Rekodi',

  outcomeQueued: 'Imehifadhiwa kwenye simu hii',
  outcomeDuplicate: 'Tayari imerekodiwa',
  outcomeSaved: 'Imehifadhiwa!',
  nextCow: 'Tayari kwa ng’ombe anayefuata...',
  sentWhenOnline: 'Itatumwa ukirudi mtandaoni.',
  saved: 'Imehifadhiwa',
  updated: 'Imebadilishwa',

  duplicate: 'Tayari imerekodiwa kwa ng’ombe huyu na kipindi hiki. Rekodi ya pili imezuiwa.',
  inProgress: 'Jaribio lako la mwisho bado linahifadhiwa. Subiri sekunde chache, kisha ubonyeze Hifadhi tena.',
  signedOut: 'Ulitolewa nje, kwa hiyo hii haikuhifadhiwa. Ingia tena, kisha ubonyeze Hifadhi.',
  saveFailed: 'Haikuweza kuhifadhiwa. Taarifa zako bado ziko hapa. Jaribu tena.',
  invalidAmount: 'Weka kiasi sahihi',
  futureDate: 'Tarehe ya kukamua haiwezi kuwa ya baadaye', // REVIEW: "kukamua" (to milk)

  deleteTitle: 'Futa rekodi hii ya maziwa?',
  deleteMessage: (description) => `${description ? `${description}. ` : ''}Huwezi kurudisha hili.`,
  deleteConfirm: 'Futa',
  deleteKeep: 'Acha',
  deleteFailed: 'Haikuweza kufuta rekodi hii. Jaribu tena.',
  deleted: 'Rekodi ya maziwa imefutwa.',
  deleteQueued: 'Itafutwa ukirudi mtandaoni.',
};
