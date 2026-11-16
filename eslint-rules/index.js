// Project-specific ESLint rules, registered in eslint.config.js as the `local` plugin.
import noMutationIsLoading from './no-mutation-is-loading.js';
import noRawTypography from './no-raw-typography.js';
import noRawTypographyCss from './no-raw-typography-css.js';

export default {
  meta: { name: 'eslint-plugin-local' },
  rules: {
    'no-mutation-is-loading': noMutationIsLoading,
    'no-raw-typography': noRawTypography,
    'no-raw-typography-css': noRawTypographyCss,
  },
};
