// No component sets its own font size, weight, family, line height or letter spacing:
// type comes from the role classes (src/styles/typeRoles.js). Flags old Tailwind classes in
// any string, and fontSize/fontWeight/… in style objects and as JSX props (Recharts).
import { findRawClasses, isTokenValue, JS_PROPERTIES, ROLE_HINT } from './typographyPatterns.js';

const keyName = (node) => (node.type === 'Identifier' ? node.name : node.type === 'Literal' ? String(node.value) : null);

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow raw typography values; use the type roles.' },
    schema: [],
    messages: {
      rawClass: '`{{cls}}` sets {{property}} directly: {{hint}}.',
      rawProperty: '`{{name}}` sets typography directly: {{hint}}.',
    },
  },
  create(context) {
    const checkText = (node, text) => {
      for (const { cls, property } of findRawClasses(text)) {
        context.report({ node, messageId: 'rawClass', data: { cls, property, hint: ROLE_HINT } });
      }
    };
    const isRawValue = (value) => !(value?.type === 'Literal' && typeof value.value === 'string' && isTokenValue(value.value));

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkText(node, node.value);
      },
      TemplateElement(node) {
        checkText(node, node.value.cooked ?? node.value.raw);
      },
      Property(node) {
        if (node.computed || node.parent.type !== 'ObjectExpression') return;
        const name = keyName(node.key);
        if (JS_PROPERTIES.includes(name) && isRawValue(node.value)) {
          context.report({ node, messageId: 'rawProperty', data: { name, hint: ROLE_HINT } });
        }
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!JS_PROPERTIES.includes(name)) return;
        const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        if (isRawValue(value)) context.report({ node, messageId: 'rawProperty', data: { name, hint: ROLE_HINT } });
      },
    };
  },
};
