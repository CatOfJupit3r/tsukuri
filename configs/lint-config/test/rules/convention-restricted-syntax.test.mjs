import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { CONVENTION_RESTRICTED_SYNTAX } from '../../src/convention-restricted-syntax.constants.mjs';

const LINT_CONFIG = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    rules: { 'no-restricted-syntax': ['error', ...CONVENTION_RESTRICTED_SYNTAX] },
  },
];

const lintMessages = (code) => new Linter().verify(code, LINT_CONFIG, { filename: 'sample.ts' }).map((m) => m.message);

const expectViolation = (code, messageFragment) => {
  const messages = lintMessages(code);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain(messageFragment);
};

describe('convention restricted syntax', () => {
  describe('re-exports', () => {
    it.each([
      "export * from './a';",
      "export { a } from './a';",
      "export type { A } from './a';",
    ])('reports %s', (code) => expectViolation(code, 'Do not re-export'));

    it('allows exporting a local declaration and importing', () => {
      expect(lintMessages("import { a } from './a';\nexport const b = a;\nexport { b as c };")).toEqual([]);
    });
  });

  describe('boolean defaults', () => {
    it.each([
      'function f(isOn = true) { return isOn; }',
      'function f({ isOn = false }) { return isOn; }',
      'const f = (isOn = false) => isOn;',
    ])('reports %s', (code) => expectViolation(code, 'boolean a default value'));

    it('allows non-boolean defaults and optional booleans', () => {
      expect(lintMessages("function f(label = 'x', count = 0, isOn?: boolean) { return [label, count, isOn]; }")).toEqual(
        [],
      );
    });
  });

  describe('bare void', () => {
    it.each(['void doWork();', 'void promise.then(handle);', 'void (async () => 1)();'])('reports %s', (code) =>
      expectViolation(code, 'rejection handler'),
    );

    it('allows a detached promise with a rejection handler', () => {
      expect(lintMessages('void doWork().catch(handle);\nvoid doWork().then(ok, fail);')).toEqual([]);
    });
  });

  describe('intersection aliases', () => {
    it('reports an intersection of an object literal', () => {
      expectViolation('type A = B & { c: string };', 'interface that extends');
    });

    it('allows an intersection of named types and a plain object alias', () => {
      expect(lintMessages('type A = B & C;\ntype D = { c: string };')).toEqual([]);
    });
  });

  describe('empty catch', () => {
    it('reports an empty catch block', () => {
      expectViolation('try { run(); } catch {}', 'empty catch');
    });

    it('reports a catch block that holds only a comment', () => {
      expectViolation('try { run(); } catch { /* ignored */ }', 'empty catch');
    });

    it('allows a catch that handles the error', () => {
      expect(lintMessages('try { run(); } catch (error) { report(error); }')).toEqual([]);
    });
  });

  describe('TypeScript enum', () => {
    it('reports an enum declaration', () => {
      expectViolation('enum Color { Red }', 'Avoid TypeScript enum');
    });

    it('allows a union type', () => {
      expect(lintMessages("type Color = 'RED';")).toEqual([]);
    });
  });
});
