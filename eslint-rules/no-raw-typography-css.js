// The CSS side of no-raw-typography (runs with @eslint/css). Outside the tokens file
// (src/styles/brand.css), font-size, font-weight, font-family, line-height and
// letter-spacing may only refer to tokens (var(--…)), and @apply may only use role classes.
import { CSS_PROPERTIES, findRawClasses, isTokenValue, ROLE_HINT } from './typographyPatterns.js';

export default {
  meta: {
    type: 'suggestion',
    language: 'css/css',
    docs: { description: 'Disallow raw typography values in CSS; use the type tokens and roles.' },
    schema: [],
    messages: {
      rawDeclaration: '`{{property}}: {{value}}` is a raw value: use a --type-* token from src/styles/brand.css or {{hint}}.',
      rawApply: '`@apply {{cls}}` sets {{property}} directly: {{hint}}.',
    },
  },
  create(context) {
    const { sourceCode } = context;
    return {
      Declaration(node) {
        const property = node.property.toLowerCase();
        if (!CSS_PROPERTIES.includes(property)) return;
        const value = sourceCode.getText(node.value).replace(/\s*!important\s*$/i, '');
        if (!isTokenValue(value)) {
          context.report({ node, messageId: 'rawDeclaration', data: { property, value, hint: ROLE_HINT } });
        }
      },
      Atrule(node) {
        if (node.name !== 'apply' || !node.prelude) return;
        for (const { cls, property } of findRawClasses(sourceCode.getText(node.prelude))) {
          context.report({ node, messageId: 'rawApply', data: { cls, property, hint: ROLE_HINT } });
        }
      },
    };
  },
};
