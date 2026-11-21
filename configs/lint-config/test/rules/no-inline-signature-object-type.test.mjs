import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { noInlineSignatureObjectTypeRule } from '../../src/rules/no-inline-signature-object-type.mjs';

const LINT_CONFIG = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { local: { rules: { 'no-inline-signature-object-type': noInlineSignatureObjectTypeRule } } },
    rules: { 'local/no-inline-signature-object-type': 'error' },
  },
];

const lintMessages = (code) => new Linter().verify(code, LINT_CONFIG, { filename: 'sample.ts' }).map((m) => m.message);

const expectViolation = (code, messageFragment) => {
  const messages = lintMessages(code);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain(messageFragment);
};

describe('no-inline-signature-object-type', () => {
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

  it.each([
    'function f(o: Promise<{ a: string }>) { return o; }',
    'function f(o: { a: string } | null) { return o; }',
    'function f(o: iX & { a: string }) { return o; }',
    'function f(o: { a: string }[]) { return o; }',
    'function f(o: Array<{ a: string }>) { return o; }',
    'function f(o: [string, { a: string }]) { return o; }',
    'function f(o: Promise<Array<{ a: string } | null>>) { return o; }',
    'function f(o: readonly { a: string }[]) { return o; }',
    'function f(o: Promise<{ a: string }> = Promise.resolve({ a: "x" })) { return o; }',
    'class C { public constructor(private o: Array<{ a: string }>) {} }',
    'type F = (o: Promise<{ a: string }>) => void;',
    'interface iX { run(o: { a: string } | null): void }',
  ])('reports an inline object type nested in the parameter type of %s', (code) => {
    expect(lintMessages(code).filter((message) => message.includes('parameter type'))).toHaveLength(1);
  });

  it.each([
    'function f(): Promise<{ a: string }> { return Promise.resolve({ a: "x" }); }',
    'function f(): { a: string } | null { return null; }',
    'function f(): Array<{ a: string }> { return []; }',
    'function f(): { a: string }[] { return []; }',
    'function f(): [string, { a: string }] { return ["x", { a: "x" }]; }',
    'class C { public run(): Promise<{ a: string } | undefined> { return Promise.resolve(undefined); } }',
    'type F = () => Promise<{ a: string }>;',
    'interface iX { run(): Array<{ a: string }> }',
  ])('reports an inline object type nested in the return type of %s', (code) => {
    expect(lintMessages(code).filter((message) => message.includes('return type'))).toHaveLength(1);
  });

  it('reports an inline type inside a nested function type once, at the inner signature', () => {
    expect(lintMessages('function f(callback: (o: { a: string }) => void) { return callback; }')).toHaveLength(1);
    expect(lintMessages('function f(callback: Array<(o: { a: string }) => void>) { return callback; }')).toHaveLength(
      1,
    );
    expect(lintMessages('function f(): Promise<() => { a: string }> { return Promise.reject(); }')).toHaveLength(1);
  });

  it.each([
    'function f(): Promise<Result<Map<string, Array<{ a: string } | null>>>> { return Promise.reject(); }',
    'function f(o: Promise<Result<Map<string, Array<Set<Readonly<Partial<Array<Promise<{ a: string }>>>>>>>>>) { return o; }',
    'function f(): Array<Array<Array<Array<Array<Array<Array<Array<Array<Array<Array<{ a: string }>>>>>>>>>>> { return []; }',
  ])('reports an inline object type nested deeper than nine wrappers in %s', (code) => {
    expect(lintMessages(code)).toHaveLength(1);
  });

  it.each([
    'function f(v: unknown): v is { a: string } { return true; }',
    'function f(v: unknown): asserts v is { a: string } {}',
    'function f(v: unknown): v is Array<{ a: string }> { return true; }',
    'function f<T>(): T extends string ? { a: string } : never { return null; }',
    'function f<T>(o: T extends string ? never : { a: string }) { return o; }',
    'function f<T>(): T extends { a: string } ? 1 : 2 { return 1; }',
    'function f(): iX[{ a: string }] { return null; }',
    'function f(o: iX["a"][{ a: string }]) { return o; }',
  ])('reports an inline object type in a predicate, conditional or indexed access type of %s', (code) => {
    expect(lintMessages(code)).toHaveLength(1);
  });

  it.each([
    'function f(): import("x").Foo<{ a: string }> { return null; }',
    'function f(o: `${keyof { a: string }}`) { return o; }',
    'function f(o: typeof g<{ a: string }>) { return o; }',
    'function f(o: import("x").Foo<{ a: string }>) { return o; }',
    'function f(): `a-${Foo<{ a: string }>}` { return null; }',
    'declare function f(o: Readonly<Partial<{ a: string }>>): void;',
    'function f(o: { [K in keyof iX]: { a: string } }) { return o; }',
    'function f(): { [K in keyof iX]: { a: string } } { return null; }',
  ])('reports an inline object type inside any wrapper type of %s', (code) => {
    expect(lintMessages(code)).toHaveLength(1);
  });

  it.each([
    'function f<T extends { a: string }>(o: T) { return o; }',
    'function f<T = { a: string }>(o: T) { return o; }',
    'function f(): void { g<{ a: string }>(); }',
    'function f(): void { new Map<string, { a: string }>(); }',
    'function f(): void { const h = g<{ a: string }>; return h; }',
    'function f(o: unknown) { return o as { a: string }; }',
    'function f(o: unknown) { return o satisfies { a: string }; }',
    'function f(o: iX) { return o; }\ntype A = { a: string };',
    'function f(o: iX) { return o; }\ninterface iY { a: { b: string }; run: (o: iX) => void }',
    'function f(o: { [K in keyof iX]: iValue }) { return o; }',
    'function f(o: { [K in keyof iX]: iX[K] }) { return o; }',
    'class C implements Foo<{ a: string }> { public x = 1; }',
    'function f(o: iX) { const v: { a: string } = o; return v; }',
  ])('does not report an inline object type behind a boundary in %s', (code) => {
    expect(lintMessages(code)).toHaveLength(0);
  });

  it('reports each inline object type of a union once, so two literals report twice', () => {
    expect(lintMessages('function f(o: { a: string } | { b: string }) { return o; }')).toHaveLength(2);
    expect(lintMessages('function f(): { a: string } | { b: string } { return null; }')).toHaveLength(2);
  });

  it('does not report inline object types outside signature annotations, or inside type aliases and interfaces', () => {
    expect(
      lintMessages(
        'type A = Promise<{ a: string }>;\nconst v: Array<{ a: string }> = [];\ninterface iX { a: { b: string }; c: Array<{ d: string }> }',
      ),
    ).toHaveLength(0);
  });

  it('reports a nested object type inside an inline object type once', () => {
    expect(lintMessages('function f(o: { a: { b: string }[] }) { return o; }')).toHaveLength(1);
  });

  it('allows named interfaces in generics, unions, arrays and tuples, and mapped types', () => {
    expect(
      lintMessages(
        'interface iUser { a: string }\nfunction f(o: Promise<iUser>, p: iUser | null, q: iUser[], r: [string, iUser], s: Record<string, iUser>, t: { [K in keyof iUser]: string }): Array<iUser> { return [o, p, q, r, s, t]; }',
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
