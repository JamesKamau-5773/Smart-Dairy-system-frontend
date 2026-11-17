import { RuleTester } from 'eslint';
import css from '@eslint/css';
import { describe, it } from 'vitest';
import rule from '../no-raw-typography.js';
import cssRule from '../no-raw-typography-css.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const jsTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});
const rawClass = { messageId: 'rawClass' };
const rawProperty = { messageId: 'rawProperty' };

jsTester.run('no-raw-typography', rule, {
  valid: [
    '<h1 className="text-page-title text-ink">Ledger</h1>;',
    '<p className="text-meta text-ink-muted sm:text-body">x</p>;',
    // Colours, alignment and transforms are not typography values here.
    '<span className="text-ink-muted text-right text-brand-900 uppercase truncate">x</span>;',
    "cn('text-label', isActive && 'text-brand');",
    // Token references are allowed in style objects.
    "<span style={{ fontSize: 'var(--type-meta-size)' }} />;",
    // Prose that happens to contain a word like these is not a class list.
    "const copy = 'Leading dairy farms in Kenya';",
    'const { fontSize } = props;',
  ],
  invalid: [
    { code: '<p className="text-sm font-bold">x</p>;', errors: [rawClass, rawClass] },
    { code: '<p className="text-[10px] uppercase tracking-widest">x</p>;', errors: [rawClass, rawClass] },
    { code: '<p className="md:text-2xl hover:font-semibold">x</p>;', errors: [rawClass, rawClass] },
    { code: '<p className="!font-black leading-relaxed">x</p>;', errors: [rawClass, rawClass] },
    { code: '<span className="font-mono tabular-nums">1</span>;', errors: [rawClass] },
    { code: 'const sizes = { sm: `inline-flex ${tone} text-xs` };', errors: [rawClass] },
    { code: '<span style={{ fontSize: 12 }} />;', errors: [rawProperty] },
    { code: "<span style={{ letterSpacing: '0.1em', lineHeight: 1.4 }} />;", errors: [rawProperty, rawProperty] },
    { code: '<XAxis tick={{ fontSize: 12 }} />;', errors: [rawProperty] },
    { code: '<YAxis fontSize={12} />;', errors: [rawProperty] },
  ],
});

const cssTester = new RuleTester({ plugins: { css }, language: 'css/css', languageOptions: { tolerant: true } });
const rawDeclaration = { messageId: 'rawDeclaration' };
const rawApply = { messageId: 'rawApply' };

cssTester.run('no-raw-typography-css', cssRule, {
  valid: [
    'body { font-size: var(--type-body-size); line-height: var(--type-body-line); }',
    'input { font-size: var(--type-control-phone-size) !important; font-family: inherit; }',
    '.eyebrow { @apply text-label text-ink-muted; }',
    '.x { color: red; text-align: right; font-variant-numeric: tabular-nums; }',
  ],
  invalid: [
    { code: '.counter { font-size: 16px; }', errors: [rawDeclaration] },
    { code: 'th { font-weight: 600; letter-spacing: 0.08em; }', errors: [rawDeclaration, rawDeclaration] },
    { code: "body { font-family: 'Inter', sans-serif; }", errors: [rawDeclaration] },
    { code: 'h1 { font: 600 24px/32px Inter; }', errors: [rawDeclaration] },
    { code: '.eyebrow { @apply text-[10px] uppercase font-bold tracking-wider; }', errors: [rawApply, rawApply, rawApply] },
  ],
});
