// Project-specific ESLint rules, registered in eslint.config.js as the `local` plugin.
import noMutationIsLoading from './no-mutation-is-loading.js';

export default {
  meta: { name: 'eslint-plugin-local' },
  rules: {
    'no-mutation-is-loading': noMutationIsLoading,
  },
};
