import { RuleTester } from 'eslint';
import css from '@eslint/css';
import { describe, it } from 'vitest';
import rule from '../type-weight-scale.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ plugins: { css }, language: 'css/css', languageOptions: { tolerant: true } });

tester.run('type-weight-scale', rule, {
  valid: [
    ':root { --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600; --weight-extrabold: 800; }',
    ':root { --type-page-title-weight: var(--weight-extrabold); }',
    ':root { --type-stat-value-weight: var(--weight-extrabold); }',
    ':root { --type-money-value-primary-weight: var(--weight-extrabold); }',
    ':root { --type-label-weight: var(--weight-medium); --type-stat-label-weight: var(--weight-semibold); }',
    // A role may share another role's weight.
    ':root { --type-badge-weight: var(--type-meta-weight); }',
    // The @font-face range is not a role weight.
    "@font-face { font-family: 'Inter'; font-weight: 100 900; }",
  ],
  invalid: [
    { code: ':root { --type-label-weight: var(--weight-extrabold); }', errors: [{ messageId: 'extrabold' }] },
    { code: ':root { --type-body-weight: var(--weight-extrabold); }', errors: [{ messageId: 'extrabold' }] },
    { code: ':root { --type-stat-label-weight: 700; }', errors: [{ messageId: 'roleWeight' }] },
    { code: ':root { --type-page-title-weight: var(--weight-black); }', errors: [{ messageId: 'roleWeight' }] },
    { code: ':root { --weight-extrabold: 900; }', errors: [{ messageId: 'weightToken' }] },
  ],
});
