import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { noInNarrowingRule } from '../../src/rules/no-in-narrowing.mjs';

const LINT_CONFIG = [
  {
    plugins: { local: { rules: { 'no-in-narrowing': noInNarrowingRule } } },
    rules: { 'local/no-in-narrowing': 'error' },
  },
];

const lint = (code) => new Linter().verify(code, LINT_CONFIG).map((message) => message.ruleId);

describe('no-in-narrowing', () => {
  it('reports `in` checks', () => {
    expect(lint("const isUser = (value) => 'name' in value;")).toEqual(['local/no-in-narrowing']);
  });

  it('allows `for...in` loops and other operators', () => {
    expect(lint('for (const key in record) console.log(key, record.name === undefined);')).toEqual([]);
  });
});
