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

  describe('inline object types', () => {
    it('reports an inline parameter type', () => {
      expectViolation('function f(options: { a: string }) { return options; }', 'parameter type');
    });

    it('reports an inline destructured parameter type', () => {
      expectViolation('const f = ({ a }: { a: string }) => a;', 'parameter type');
    });

    it.each([
      'function f(...items: { a: string }) { return items; }',
      'function f([first]: { a: string }) { return first; }',
      'class C { public run(options: { a: string }) { return options; } }',
      'declare function f(options: { a: string }): void;',
      'class C { public run(options: { a: string }): void; public run(options: unknown): void {} }',
      'abstract class C { public abstract run(options: { a: string }): void; }',
      'function f(options: { a: string } = { a: "x" }) { return options; }',
      'const f = ({ a }: { a: string } = { a: "x" }) => a;',
      'class C { public constructor(private options: { a: string }) {} }',
      'class C { public constructor(private options: { a: string } = { a: "x" }) {} }',
    ])('reports an inline parameter type in %s', (code) => {
      expect(lintMessages(code).filter((message) => message.includes('parameter type'))).toHaveLength(1);
    });

    it('reports an inline return type of a class method and a declared function', () => {
      expect(lintMessages('class C { public run(): { a: string } { return { a: "x" }; } }')).toHaveLength(1);
      expect(lintMessages('declare function f(): { a: string };')).toHaveLength(1);
      expect(lintMessages('abstract class C { public abstract run(): { a: string }; }')).toHaveLength(1);
    });

    it.each([
      'type F = (options: { a: string }) => void;',
      'type F = new (options: { a: string }) => object;',
      'interface iX { run(options: { a: string }): void }',
      'interface iX { (options: { a: string }): void }',
      'interface iX { new (options: { a: string }): object }',
      'type T = { run(options: { a: string }): void };',
    ])('reports an inline parameter type in the signature %s', (code) => {
      expect(lintMessages(code).filter((message) => message.includes('parameter type'))).toHaveLength(1);
    });

    it.each([
      'type F = () => { a: string };',
      'type F = new () => { a: string };',
      'interface iX { run(): { a: string } }',
      'interface iX { (): { a: string } }',
      'interface iX { new (): { a: string } }',
    ])('reports an inline return type in the signature %s', (code) => {
      expect(lintMessages(code).filter((message) => message.includes('return type'))).toHaveLength(1);
    });

    it('allows named types in function types and method signatures', () => {
      expect(
        lintMessages(
          'interface iOptions { a: string }\ntype F = (options: iOptions) => iOptions;\ninterface iX { run(options: iOptions): iOptions }',
        ),
      ).toEqual([]);
    });

    it('reports an inline return type', () => {
      expectViolation('function f(): { a: string } { return { a: "x" }; }', 'return type');
    });

    it('allows named interfaces and inline types outside function signatures', () => {
      expect(
        lintMessages(
          'interface iOptions { a: string }\nfunction f(options: iOptions = { a: "x" }): iOptions { return options; }\nclass C { public constructor(private options: iOptions) {} }\nconst value: { a: string } = { a: "x" };',
        ),
      ).toEqual([]);
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
