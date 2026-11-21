import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import lintConfigWorkspaceConfig from '../eslint.config.mjs';

const RESTRICTION_RULE_ID = 'no-restricted-syntax';
const SOURCE_FILE_NAME = 'src/example.mjs';
const OTHER_FILE_NAME = 'test/example.mjs';

const lint = (code, fileName) => new Linter().verify(code, lintConfigWorkspaceConfig, fileName);

describe('lint-config package loading restriction', () => {
  it.each([
    ['require call', "const globals = require('globals');"],
    ['require.resolve call', "require.resolve('globals');"],
    ['createRequire', "import { createRequire } from 'node:module';"],
    ['import.meta.resolve', "import.meta.resolve('globals');"],
    ['dynamic import', "await import('globals');"],
  ])('reports a %s in a lint-config source with the static import message', (_form, code) => {
    const [message] = lint(code, SOURCE_FILE_NAME);

    expect(message.ruleId).toBe(RESTRICTION_RULE_ID);
    expect(message.message).toContain('static import');
  });

  it('allows static imports and export-from declarations', () => {
    expect(lint("import globals from 'globals';\nexport { x } from 'pkg-a';", SOURCE_FILE_NAME)).toEqual([]);
  });

  it('does not restrict files outside src', () => {
    expect(lint("const globals = require('globals');", OTHER_FILE_NAME)).toEqual([]);
  });
});
