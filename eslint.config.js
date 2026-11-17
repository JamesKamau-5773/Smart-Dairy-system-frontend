import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import css from '@eslint/css'
import localRules from './eslint-rules/index.js'

// Typography (eslint-rules/no-raw-typography*.js): type comes from the role classes. A warning
// while pages move over, phase by phase; an error for files already moved, so they stay moved.
// Add each file here as its phase lands. The rule becomes an error everywhere in the cleanup phase.
const TYPOGRAPHY_MIGRATED = [
  'src/index.css',
  'src/lib/utils.js',
  // Phase 2 pilot: Production Log, Ledger, Farm Reports and the shared parts they use.
  'src/pages/operations/productionLog.jsx',
  'src/pages/finance/FinancialLedger.jsx',
  'src/pages/operations/OperationsReportsPage.jsx',
  'src/components/data/**',
  'src/components/layout/PageHeader.jsx',
  'src/components/periods/**',
  'src/components/ui/Money.jsx',
  'src/components/ui/button.jsx',
  'src/components/ui/OverflowMenu.jsx',
  'src/components/ui/ListLoadState.jsx',
  'src/components/operations/FastMilkLog.jsx',
  'src/components/operations/QueuedMilkEntries.jsx',
  'src/components/operations/CalfMilkFeedModal.jsx',
  'src/components/operations/RecentCalfFeedings.jsx',
  'src/components/finance/MoneyFlowChart.jsx',
  'src/components/finance/ReceiptPreview.jsx',
  'src/components/finance/LedgerEntryFormModal.jsx',
  'src/components/finance/LedgerCorrectionModal.jsx',
  'src/components/finance/ReceiptPhotosModal.jsx',
  'src/components/finance/AttachmentThumb.jsx',
  'src/lib/enumLabel.js',
  // Phase 3: herd management.
  'src/pages/operations/HerdRegistry.jsx',
  'src/pages/operations/BreedingHub.jsx',
  'src/pages/operations/MedicalRecords.jsx',
  'src/pages/operations/MilkDropReports.jsx',
  'src/pages/operations/AnimalRecord.jsx',
  'src/pages/operations/MilkHistory.jsx',
  'src/components/forms/breeding/**',
  'src/components/operations/animalRecord/**',
  'src/components/ui/CowPhoto.jsx',
  'src/components/ui/GroupedDateRows.jsx',
  'src/components/ui/SearchSuggestions.jsx',
  'src/components/ui/DraftRestoredNotice.jsx',
  // Phase 4: operations and feeding.
  'src/pages/operations/MilkUsage.jsx',
  'src/pages/operations/DailyRoutinePlanner.jsx',
  'src/pages/operations/HerdsmanView.jsx',
  'src/pages/operations/ClerkEntry.jsx',
  'src/pages/operations/MilkLab.jsx',
  'src/pages/nutrition/**',
  'src/pages/inventory/FeedFormulation.jsx',
  'src/components/nutrition/CreateBatchModal.jsx',
  'src/components/nutrition/CurrentMixCard.jsx',
  'src/components/nutrition/FeedingGroupPlanner.jsx',
  'src/components/nutrition/ProfitabilityChart.jsx',
  'src/components/nutrition/RecipeMeasurementFields.jsx',
  'src/components/operations/MilkDispositionHistory.jsx',
  'src/components/ui/InlineNotice.jsx',
  'src/lib/feedingGroups.js',
  // Phase 5a: finance, supply and reports.
  'src/pages/finance/BuyersList.jsx',
  'src/pages/finance/CustomerProfile.jsx',
  'src/pages/operations/Customers.jsx',
  'src/pages/inventory/InventoryRegistry.jsx',
  'src/pages/finance/DairyUnitEconomicsReport.jsx',
  'src/pages/finance/AnimalEconomicsReport.jsx',
  'src/pages/operations/MilkInventoryReport.jsx',
  'src/components/finance/CustomerForm.jsx',
  'src/components/finance/DeliveryModal.jsx',
  'src/components/finance/MetricLabel.jsx',
  'src/components/inventory/**',
  'src/components/ui/RecordedValue.jsx',
  // Phase 5b: compliance and HR.
  'src/pages/operations/SafetyDashboard.jsx',
  'src/pages/hr/**',
  'src/components/forms/AccessProvisioningFields.jsx',
  'src/components/forms/AddEmployeeModal.jsx',
  'src/components/forms/AdvanceRepaymentModal.jsx',
  'src/components/forms/EmployeeAccountInviteModal.jsx',
  'src/components/forms/EmployeeDrawer.jsx',
  'src/components/forms/OffboardEmployeeModal.jsx',
  'src/components/forms/PayPayrollModal.jsx',
  'src/components/forms/StatutoryDeductionsToggle.jsx',
  'src/components/forms/VerifyReturnModal.jsx',
  'src/components/forms/employeeDrawer/**',
  'src/components/operations/CowSelect.jsx',
  'src/components/operations/MilkTestHistory.jsx',
  'src/components/operations/PlaceHoldModal.jsx',
  'src/components/operations/RecordMilkTestModal.jsx',
  'src/components/operations/ReleaseMilkModal.jsx',
]
// Allowed raw values: the tokens file and the Tailwind configs that define the old scale,
// the landing page until its own phase (it keeps its fluid display sizes), copy, and tests.
const TYPOGRAPHY_EXEMPT = [
  'src/styles/brand.css',
  'tailwind.config.js',
  'tailwind.landing.config.js',
  'src/landing/**',
  'src/i18n/**',
  '**/__tests__/**',
  '**/*.test.{js,jsx}',
  'eslint-rules/**',
  'e2e/**',
  'scripts/**',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { local: localRules },
    rules: {
      // TanStack Query v5 mutations have isPending, not isLoading (eslint-rules/no-mutation-is-loading.js).
      'local/no-mutation-is-loading': 'error',
      'local/no-raw-typography': 'warn',
      // Farm dates are local calendar days. `toISOString()` is UTC, which in Nairobi
      // is still yesterday until 03:00. Use todayLocalIso / toLocalIsoDate (src/lib/localDate).
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name=/^(slice|substring)$/][callee.object.callee.property.name='toISOString']",
          message: 'UTC date: use todayLocalIso() or toLocalIsoDate() from src/lib/localDate.',
        },
        {
          selector: "MemberExpression[object.callee.property.name='split'][object.callee.object.callee.property.name='toISOString']",
          message: 'UTC date: use todayLocalIso() or toLocalIsoDate() from src/lib/localDate.',
        },
      ],
    },
  },
  {
    // Playwright and the build scripts run in Node, not the browser.
    files: ['e2e/**', 'playwright.config.js', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
  {
    // The one place allowed to build a date string from toISOString (after shifting to local time).
    files: ['src/lib/localDate.js', '**/__tests__/**', 'e2e/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.css'],
    plugins: { css, local: localRules },
    language: 'css/css',
    // Tailwind's @tailwind / @apply / theme() are not standard CSS.
    languageOptions: { tolerant: true },
    rules: { 'local/no-raw-typography-css': 'warn' },
  },
  {
    files: TYPOGRAPHY_MIGRATED.filter((file) => !file.endsWith('.css')),
    rules: { 'local/no-raw-typography': 'error' },
  },
  {
    files: TYPOGRAPHY_MIGRATED.filter((file) => file.endsWith('.css')),
    rules: { 'local/no-raw-typography-css': 'error' },
  },
  {
    files: TYPOGRAPHY_EXEMPT,
    rules: { 'local/no-raw-typography': 'off', 'local/no-raw-typography-css': 'off' },
  },
])
