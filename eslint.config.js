import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import localRules from './eslint-rules/index.js'

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
])
