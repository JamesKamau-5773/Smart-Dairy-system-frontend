// What counts as a raw typography value, shared by the JS and CSS typography rules.
// Type is set with the `text-<role>` classes (src/styles/typeRoles.js); their values are
// tokens in src/styles/brand.css.

// Old Tailwind classes that set size, weight, family, line height or letter spacing.
const RAW_CLASS_PATTERNS = [
  ['font-size', /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/],
  ['font-size', /^text-\[(?:\d*\.?\d+(?:px|rem|em)|clamp\(.*\)|calc\(.*\))\]$/],
  ['font-weight', /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/],
  ['font-family', /^font-(?:sans|serif|mono|display|\[.+\])$/],
  ['line-height', /^leading-(?:none|tight|snug|normal|relaxed|loose|\d+|\[.+\])$/],
  ['letter-spacing', /^tracking-(?:tighter|tight|normal|wide|wider|widest|\[.+\])$/],
];

/** Drops variant prefixes (`sm:`, `hover:`, `[&_svg]:`) and the `!` important marker. */
function baseClass(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === '[') depth += 1;
    else if (token[i] === ']') depth -= 1;
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '');
}

/** The raw typography classes in a class string, as [{ cls, property }]. */
export function findRawClasses(text) {
  const found = [];
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const cls = baseClass(token);
    const match = RAW_CLASS_PATTERNS.find(([, pattern]) => pattern.test(cls));
    if (match) found.push({ cls: token, property: match[0] });
  }
  return found;
}

export const CSS_PROPERTIES = ['font', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing'];
export const JS_PROPERTIES = ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing'];

/** A value that only refers to tokens (var(--…)) or resets (inherit, …) is not raw. */
export function isTokenValue(value) {
  const text = String(value).trim();
  if (/^(?:inherit|initial|unset|revert)$/.test(text)) return true;
  return text !== '' && text.replace(/var\(--[\w-]+(?:,[^()]*)?\)/g, '').replace(/[\s/]/g, '') === '';
}

export const ROLE_HINT = 'use a text-<role> class (src/styles/typeRoles.js)';
