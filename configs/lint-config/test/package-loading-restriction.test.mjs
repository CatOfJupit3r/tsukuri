import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import lintConfigWorkspaceConfig from '../eslint.config.mjs';

const RESTRICTION_RULE_ID = 'no-restricted-syntax';
const SOURCE_FILE_NAME = 'src/example.mjs';
const OTHER_FILE_NAME = 'test/example.mjs';

function lint(code, fileName) {
  return new Linter().verify(code, lintConfigWorkspaceConfig, fileName);
}

describe('lint-config package loading restriction', () => {
  it.each([
    ['require call', "const globals = require('globals');"],
    ['require.resolve call', "require.resolve('globals');"],
    ['createRequire', "import { createRequire } from 'node:module';"],
    ['import.meta.resolve', "import.meta.resolve('globals');"],
    ['dynamic import', "await import('globals');"],
    ['computed import.meta.resolve', "import.meta['resolve']('globals');"],
    ['destructured import.meta', "const { resolve } = import.meta;\nresolve('globals');"],
    ['assigned destructured import.meta', 'let resolve;\n({ resolve } = import.meta);'],
    ['unknown import.meta property', 'const environment = import.meta.env;'],
    ['computed import.meta property', 'const value = import.meta[name];'],
    ['computed createRequire', "const create = nodeModule['createRequire'];"],
    ['computed require call', "nodeModule['require']('globals');"],
    ['member require call', "nodeModule.require('globals');"],
    [
      'namespace createRequire',
      "import * as nodeModule from 'node:module';\nnodeModule.createRequire(import.meta.url);",
    ],
    ['destructured createRequire', 'const { createRequire } = nodeModule;'],
    ['require passed as a value', 'load(require);'],
    ['import.meta alias', "const meta = import.meta;\nmeta.resolve('globals');"],
    ['import.meta as an argument', 'load(import.meta);'],
    ['import.meta parameter default', "function load({ resolve } = import.meta) {\n  return resolve('globals');\n}"],
    ['template literal createRequire key', 'const create = nodeModule[`createRequire`];'],
    ['computed getBuiltinModule chain', "process.getBuiltinModule('node:module')[`createRequire`];"],
    ['getBuiltinModule call', "process.getBuiltinModule('node:module');"],
    ['module.require', "module.require('globals');"],
    ['importPlugin as a value', 'const load = importPlugin;'],
    ['importPlugin with an identifier', 'await importPlugin(pluginName);'],
    ['default import of node:module', "import nodeModule from 'node:module';"],
    ['namespace import of module', "import * as nodeModule from 'module';"],
    ['importPlugin with a number', 'await importPlugin(5);'],
    ['importPlugin with a template expression', 'await importPlugin(`plugin-${name}`);'],
  ])('reports a %s in a lint-config source with the static import message', (_form, code) => {
    const [message] = lint(code, SOURCE_FILE_NAME);

    expect(message.ruleId).toBe(RESTRICTION_RULE_ID);
    expect(message.message).toContain('static import');
  });

  it.each([
    ['import.meta.url', 'const location = import.meta.url;'],
    ['import.meta.dirname', 'const directory = import.meta.dirname;'],
    ['import.meta.filename', 'const file = import.meta.filename;'],
    ['an object key named require', 'const mapping = { require: value, createRequire: other };'],
    ['a property named require', 'const value = options.require;'],
    ['a variable computed access', 'const value = config[key];'],
    ['a template computed key with an expression', 'const rule = { [`${NAMESPACE}/rule`]: 1 };'],
    ['a numeric computed access', 'const first = array[0];'],
    ['a string computed access', "const value = options['key'];"],
    ['an ordinary node:path import', "import path from 'node:path';"],
    ['importPlugin with a string literal', "await importPlugin('eslint-plugin-example');"],
  ])('allows %s in a lint-config source', (_form, code) => {
    expect(lint(code, SOURCE_FILE_NAME)).toEqual([]);
  });

  it('allows static imports and export-from declarations', () => {
    expect(lint("import globals from 'globals';\nexport { x } from 'pkg-a';", SOURCE_FILE_NAME)).toEqual([]);
  });

  it('does not restrict files outside src', () => {
    expect(lint("const globals = require('globals');", OTHER_FILE_NAME)).toEqual([]);
  });
});
