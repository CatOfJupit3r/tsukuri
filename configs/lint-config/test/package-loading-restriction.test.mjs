import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import lintConfigWorkspaceConfig from '../eslint.config.mjs';

const RESTRICTION_RULE_ID = 'no-restricted-syntax';
const SOURCE_FILE_NAME = 'src/example.mjs';
const OTHER_FILE_NAME = 'test/example.mjs';

const SELECTOR_ID_PATTERN = / \((\w+)\)$/;

function readSelectorId(message) {
  expect(message.ruleId).toBe(RESTRICTION_RULE_ID);
  return SELECTOR_ID_PATTERN.exec(message.message)?.[1];
}

function lint(code, fileName) {
  return new Linter().verify(code, lintConfigWorkspaceConfig, fileName);
}

describe('lint-config package loading restriction', () => {
  it.each([
    ['require call', 'LOADING_NAME_IDENTIFIER', "const globals = require('globals');"],
    ['require.resolve call', 'LOADING_NAME_IDENTIFIER', "require.resolve('globals');"],
    ['createRequire', 'LOADING_NAME_IDENTIFIER', "import { createRequire } from 'node:module';"],
    ['import.meta.resolve', 'IMPORT_META', "import.meta.resolve('globals');"],
    ['dynamic import', 'IMPORT_EXPRESSION', "await import('globals');"],
    ['computed import.meta.resolve', 'IMPORT_META', "import.meta['resolve']('globals');"],
    ['destructured import.meta', 'IMPORT_META', "const { resolve } = import.meta;\nresolve('globals');"],
    ['assigned destructured import.meta', 'IMPORT_META', 'let resolve;\n({ resolve } = import.meta);'],
    ['unknown import.meta property', 'IMPORT_META', 'const environment = import.meta.env;'],
    ['computed import.meta property', 'IMPORT_META', 'const value = import.meta[name];'],
    ['computed createRequire', 'COMPUTED_MEMBER_KEY', "const create = nodeModule['createRequire'];"],
    ['computed require call', 'COMPUTED_MEMBER_KEY', "nodeModule['require']('globals');"],
    ['member require call', 'CALLED_MEMBER', "nodeModule.require('globals');"],
    [
      'namespace createRequire',
      'LOADING_MEMBER',
      "import * as nodeModule from 'node:module';\nnodeModule.createRequire(import.meta.url);",
    ],
    ['destructured createRequire', 'DESTRUCTURED_NAME', 'const { createRequire } = nodeModule;'],
    ['require passed as a value', 'LOADING_NAME_IDENTIFIER', 'load(require);'],
    ['import.meta alias', 'IMPORT_META', "const meta = import.meta;\nmeta.resolve('globals');"],
    ['import.meta as an argument', 'IMPORT_META', 'load(import.meta);'],
    [
      'import.meta parameter default',
      'IMPORT_META',
      "function load({ resolve } = import.meta) {\n  return resolve('globals');\n}",
    ],
    ['template literal createRequire key', 'COMPUTED_MEMBER_KEY', 'const create = nodeModule[`createRequire`];'],
    [
      'computed getBuiltinModule chain',
      'COMPUTED_MEMBER_KEY',
      "process.getBuiltinModule('node:module')[`createRequire`];",
    ],
    ['getBuiltinModule call', 'CALLED_MEMBER', "process.getBuiltinModule('node:module');"],
    ['module.require', 'CALLED_MEMBER', "module.require('globals');"],
    ['importPlugin as a value', 'IMPORT_PLUGIN_VALUE', 'const load = importPlugin;'],
    ['importPlugin with an identifier', 'IMPORT_PLUGIN_ARGUMENT', 'await importPlugin(pluginName);'],
    ['default import of node:module', 'MODULE_BUILTIN_IMPORT', "import nodeModule from 'node:module';"],
    ['namespace import of module', 'MODULE_BUILTIN_IMPORT', "import * as nodeModule from 'module';"],
    ['namespace re-export of node:module', 'MODULE_BUILTIN_IMPORT', "export * as nodeModule from 'node:module';"],
    ['default re-export of module', 'MODULE_BUILTIN_IMPORT', "export { default as nodeModule } from 'module';"],
    ['named re-export of node:module', 'MODULE_BUILTIN_IMPORT', "export { createRequire } from 'node:module';"],
    ['importPlugin with a number', 'IMPORT_PLUGIN_ARGUMENT', 'await importPlugin(5);'],
    ['importPlugin with a template expression', 'IMPORT_PLUGIN_ARGUMENT', 'await importPlugin(`plugin-${name}`);'],
  ])('reports a %s in a lint-config source through the %s selector', (_form, selectorId, code) => {
    const reportedSelectorIds = lint(code, SOURCE_FILE_NAME).map(readSelectorId);

    expect(reportedSelectorIds).toContain(selectorId);
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
    ['a local re-export', "export { x } from './local.mjs';"],
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
