import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../no-mutation-is-loading.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } });
const error = { messageId: 'useIsPending' };

ruleTester.run('no-mutation-is-loading', rule, {
  valid: [
    'const { isPending } = useMutation({});',
    'const mutation = useMutation({}); mutation.isPending;',
    // Queries still have isLoading.
    'const { isLoading } = useQuery({}); const q = useQuery({}); q.isLoading;',
    'const mutation = useMutation({}); const other = {}; other.isLoading;',
    'const mutation = useMutation({}); mutation[isLoading];',
  ],
  invalid: [
    { code: 'const { mutate, isLoading: isSaving } = useMutation({});', errors: [error] },
    { code: 'const { isLoading } = useMutation({});', errors: [error] },
    { code: 'const mutation = useMutation({}); if (mutation.isLoading) {}', errors: [error] },
    { code: 'const mutation = useMutation({}); mutation?.isLoading;', errors: [error] },
    { code: "const mutation = useMutation({}); mutation['isLoading'];", errors: [error] },
    { code: 'const mutation = useMutation({}); const { isLoading } = mutation;', errors: [error] },
    { code: 'const save = useSaveCustomerMutation(); save.isLoading;', errors: [error] },
    { code: 'const m = ReactQuery.useMutation({}); m.isLoading;', errors: [error] },
    { code: 'useMutation({}).isLoading;', errors: [error] },
  ],
});
