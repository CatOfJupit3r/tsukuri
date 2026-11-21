import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import lintConfigWorkspaceConfig from "../eslint.config.mjs";

const RESTRICTION_RULE_ID = "no-restricted-syntax";
const SOURCE_FILE_NAME = "src/example.mjs";
const OTHER_FILE_NAME = "test/example.mjs";

function lint(code, fileName) {
  return new Linter().verify(code, lintConfigWorkspaceConfig, fileName);
}

describe("lint-config package loading restriction", () => {
  it.each([
    ["require call", "const globals = require('globals');"],
    ["require.resolve call", "require.resolve('globals');"],
    ["createRequire", "import { createRequire } from 'node:module';"],
    ["import.meta.resolve", "import.meta.resolve('globals');"],
    ["dynamic import", "await import('globals');"],
    ["computed import.meta.resolve", "import.meta['resolve']('globals');"],
    [
      "destructured import.meta",
      "const { resolve } = import.meta;\nresolve('globals');",
    ],
    [
      "assigned destructured import.meta",
      "let resolve;\n({ resolve } = import.meta);",
    ],
    ["unknown import.meta property", "const environment = import.meta.env;"],
    ["computed import.meta property", "const value = import.meta[name];"],
    ["computed createRequire", "const create = nodeModule['createRequire'];"],
    ["computed require call", "nodeModule['require']('globals');"],
    ["member require call", "nodeModule.require('globals');"],
    [
      "namespace createRequire",
      "import * as nodeModule from 'node:module';\nnodeModule.createRequire(import.meta.url);",
    ],
    ["destructured createRequire", "const { createRequire } = nodeModule;"],
    ["require passed as a value", "load(require);"],
    ["importPlugin with an identifier", "await importPlugin(pluginName);"],
    [
      "importPlugin with a template expression",
      "await importPlugin(`plugin-${name}`);",
    ],
  ])(
    "reports a %s in a lint-config source with the static import message",
    (_form, code) => {
      const [message] = lint(code, SOURCE_FILE_NAME);

      expect(message.ruleId).toBe(RESTRICTION_RULE_ID);
      expect(message.message).toContain("static import");
    },
  );

  it.each([
    ["import.meta.url", "const location = import.meta.url;"],
    ["import.meta.dirname", "const directory = import.meta.dirname;"],
    ["import.meta.filename", "const file = import.meta.filename;"],
    [
      "an object key named require",
      "const mapping = { require: value, createRequire: other };",
    ],
    ["a property named require", "const value = options.require;"],
    [
      "importPlugin with a string literal",
      "await importPlugin('eslint-plugin-example');",
    ],
  ])("allows %s in a lint-config source", (_form, code) => {
    expect(lint(code, SOURCE_FILE_NAME)).toEqual([]);
  });

  it("allows static imports and export-from declarations", () => {
    expect(
      lint(
        "import globals from 'globals';\nexport { x } from 'pkg-a';",
        SOURCE_FILE_NAME,
      ),
    ).toEqual([]);
  });

  it("does not restrict files outside src", () => {
    expect(
      lint("const globals = require('globals');", OTHER_FILE_NAME),
    ).toEqual([]);
  });
});
