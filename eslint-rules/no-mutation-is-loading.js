/**
 * Flags `isLoading` read from a TanStack Query v5 mutation result.
 *
 * v5 renamed a mutation's `isLoading` to `isPending`; reading `isLoading` gives `undefined`,
 * so "disable while saving" guards silently stop working and a double tap saves twice.
 * (Queries still have `isLoading`; this rule only looks at mutation results.)
 *
 * Caught:
 *   const { isLoading } = useMutation(...)
 *   const m = useMutation(...); m.isLoading; m?.isLoading; const { isLoading } = m;
 *   useMutation(...).isLoading
 * A "mutation hook" is `useMutation` or any `use…Mutation` hook. Mutations handed out by
 * other hooks under other names (e.g. an object of mutations) are not tracked.
 */

const MUTATION_HOOK = /^use(?:[A-Z]\w*)?Mutation$/;

function calleeName(callee) {
  if (callee?.type === 'Identifier') return callee.name;
  if (callee?.type === 'MemberExpression' && !callee.computed) return callee.property.name;
  return null;
}

const isMutationHookCall = (node) => node?.type === 'CallExpression'
  && MUTATION_HOOK.test(calleeName(node.callee) ?? '');

const isIsLoadingKey = (key, computed) => (
  (!computed && key?.type === 'Identifier' && key.name === 'isLoading')
  || (key?.type === 'Literal' && key.value === 'isLoading')
);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow reading `isLoading` from a TanStack Query v5 mutation result (use `isPending`).',
    },
    messages: {
      useIsPending: 'Mutations have no `isLoading` in TanStack Query v5 (it is always undefined). Use `isPending`.',
    },
    schema: [],
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'useIsPending' });

    const reportDestructured = (pattern) => {
      pattern.properties
        .filter((property) => property.type === 'Property' && isIsLoadingKey(property.key, property.computed))
        .forEach((property) => report(property.key));
    };

    return {
      VariableDeclarator(node) {
        if (!isMutationHookCall(node.init)) return;

        if (node.id.type === 'ObjectPattern') {
          reportDestructured(node.id);
          return;
        }
        if (node.id.type !== 'Identifier') return;

        for (const variable of context.sourceCode.getDeclaredVariables(node)) {
          for (const reference of variable.references) {
            const { identifier } = reference;
            const { parent } = identifier;
            if (parent?.type === 'MemberExpression' && parent.object === identifier
              && isIsLoadingKey(parent.property, parent.computed)) {
              report(parent.property);
            } else if (parent?.type === 'VariableDeclarator' && parent.init === identifier
              && parent.id.type === 'ObjectPattern') {
              reportDestructured(parent.id);
            }
          }
        }
      },
      MemberExpression(node) {
        if (isMutationHookCall(node.object) && isIsLoadingKey(node.property, node.computed)) {
          report(node.property);
        }
      },
    };
  },
};
