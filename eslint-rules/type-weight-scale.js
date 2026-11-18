// Keeps the weight scale in the tokens file (src/styles/brand.css). The weight tokens are 400,
// 500, 600 and 800; each role's weight (--type-<role>-weight) must name one of them, and only
// the roles in EXTRABOLD_ROLES (src/styles/typeRoles.js: the page title and headline figures)
// may use 800. Every other role stays at 600 or below.
import { EXTRABOLD_ROLES } from '../src/styles/typeRoles.js';

const WEIGHT_TOKENS = { '--weight-regular': '400', '--weight-medium': '500', '--weight-semibold': '600', '--weight-extrabold': '800' };
const EXTRABOLD = 'var(--weight-extrabold)';
const ROLE_WEIGHT = /^--type-(.+)-weight$/;

export default {
  meta: {
    type: 'problem',
    language: 'css/css',
    docs: { description: 'Allow the 800 weight only for the page title and headline figure roles.' },
    schema: [],
    messages: {
      weightToken: '`{{property}}` must be {{value}} (the weight scale is 400, 500, 600 and 800).',
      roleWeight: '`{{property}}: {{value}}`: a role weight must be var(--weight-regular|medium|semibold|extrabold).',
      extrabold: '`{{role}}` may not use 800: only {{allowed}} do (EXTRABOLD_ROLES in src/styles/typeRoles.js).',
    },
  },
  create(context) {
    const { sourceCode } = context;
    return {
      Declaration(node) {
        const property = node.property;
        const value = sourceCode.getText(node.value).trim();
        if (property in WEIGHT_TOKENS) {
          if (value !== WEIGHT_TOKENS[property]) {
            context.report({ node, messageId: 'weightToken', data: { property, value: WEIGHT_TOKENS[property] } });
          }
          return;
        }
        const role = ROLE_WEIGHT.exec(property)?.[1];
        if (!role) return;
        const token = /^var\((--weight-[a-z]+)\)$/.exec(value)?.[1];
        if (!token || !(token in WEIGHT_TOKENS)) {
          // A role may also take another role's weight (var(--type-label-weight)).
          if (!/^var\(--type-[\w-]+-weight\)$/.test(value)) {
            context.report({ node, messageId: 'roleWeight', data: { property, value } });
          }
          return;
        }
        if (value === EXTRABOLD && !EXTRABOLD_ROLES.includes(role)) {
          context.report({ node, messageId: 'extrabold', data: { role, allowed: EXTRABOLD_ROLES.join(', ') } });
        }
      },
    };
  },
};
