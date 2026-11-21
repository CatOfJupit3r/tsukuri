import tsParser from '@typescript-eslint/parser';
import { ESLint, Linter } from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createConventionRulesConfig } from '../src/convention-rules.mjs';
import {
  createBackendConfig,
  createBackendOxlintConfig,
  createWebConfig,
  createWebOxlintConfig,
} from '../src/eslint.mjs';
import {
  MAX_COGNITIVE_COMPLEXITY,
  MAX_DEPTH,
  MAX_FILES_PER_FOLDER,
  MAX_JSX_DEPTH,
  MAX_LINES_PER_FUNCTION,
} from '../src/lint-limits.mjs';

const ERROR = 2;
const OFF = 0;
const WORKER_ENTRY_FILE = 'src/worker.ts';
const FUNCTION_FRAME_LINES = 2;

const LIMIT_RULE_NAMES = ['sonarjs/cognitive-complexity', 'max-lines-per-function', 'max-depth'];

const REACT_COMPILER_RULE_NAMES = [
  'react-hooks/set-state-in-effect',
  'react-hooks/refs',
  'react-hooks/immutability',
  'react-hooks/preserve-manual-memoization',
  'react-hooks/static-components',
];

let workspaceDirectory;
let backendEslint;
let backendOxlintConfig;
let webEslint;
let webOxlintConfig;

function createEslint(config) {
  return new ESLint({
    cwd: workspaceDirectory,
    overrideConfigFile: true,
    overrideConfig: config,
  });
}

function toEslintEntry(oxlintValue) {
  const [severity, ...options] = Array.isArray(oxlintValue) ? oxlintValue : [oxlintValue];
  return [severity === 'error' ? ERROR : OFF, ...options];
}

/** oxlint names the plugins of the rules it runs differently from ESLint. */
function toOxlintRuleName(ruleName) {
  return ruleName
    .replace('@typescript-eslint/', 'typescript/')
    .replace('import-x/', 'import/')
    .replace('react-hooks/', 'react/');
}

function readOxlintEntry(oxlintConfig, fileName, ruleName) {
  const matchingValues = oxlintConfig.overrides
    .filter((override) => override.files.some((pattern) => path.matchesGlob(fileName, pattern)))
    .map((override) => override.rules?.[toOxlintRuleName(ruleName)])
    .filter((value) => value !== undefined);

  return matchingValues.length > 0 ? toEslintEntry(matchingValues.at(-1)) : [OFF];
}

/** The rule as enforced for a file: by ESLint, or by oxlint for the rules it runs in ESLint's place. */
async function readEnforcedEntry({ eslint, oxlintConfig }, fileName, ruleName) {
  const resolved = await eslint.calculateConfigForFile(path.join(workspaceDirectory, fileName));
  const eslintEntry = resolved.rules[ruleName] ?? [OFF];
  return eslintEntry[0] === ERROR ? eslintEntry : readOxlintEntry(oxlintConfig, fileName, ruleName);
}

async function readEslintRules(eslint, fileName) {
  const resolved = await eslint.calculateConfigForFile(path.join(workspaceDirectory, fileName));
  return resolved.rules;
}

describe('convention rules in the exported workspace configs', () => {
  let backend;
  let web;

  beforeAll(async () => {
    workspaceDirectory = await mkdtemp(path.join(tmpdir(), 'convention-config-'));
    await writeFile(path.join(workspaceDirectory, '.gitignore'), 'ignored-by-git.ts\n');
    const options = {
      rootDir: pathToFileURL(path.join(workspaceDirectory, 'eslint.config.mjs')).href,
      defaultExportFiles: [WORKER_ENTRY_FILE],
    };
    backendEslint = createEslint(await createBackendConfig(options));
    backendOxlintConfig = await createBackendOxlintConfig(options);
    webEslint = createEslint(await createWebConfig(options));
    webOxlintConfig = await createWebOxlintConfig(options);
    backend = { eslint: backendEslint, oxlintConfig: backendOxlintConfig };
    web = { eslint: webEslint, oxlintConfig: webOxlintConfig };
  });

  afterAll(async () => {
    await rm(workspaceDirectory, { recursive: true, force: true });
  });

  it('enforces every convention rule with the limits of lint-limits.mjs for a TypeScript file', async () => {
    const expectedEntries = {
      '@typescript-eslint/explicit-member-accessibility': [ERROR, { accessibility: 'explicit' }],
      'import-x/no-default-export': [ERROR],
      'tsukuri/max-files-per-folder': [ERROR, { max: MAX_FILES_PER_FOLDER }],
      'sonarjs/cognitive-complexity': [ERROR, MAX_COGNITIVE_COMPLEXITY],
      'max-lines-per-function': [
        ERROR,
        {
          max: MAX_LINES_PER_FUNCTION,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-depth': [ERROR, MAX_DEPTH],
    };

    for (const [ruleName, expectedEntry] of Object.entries(expectedEntries)) {
      expect(await readEnforcedEntry(backend, 'src/service.ts', ruleName), ruleName).toEqual(expectedEntry);
    }
    expect((await readEslintRules(backendEslint, 'src/service.ts'))['no-restricted-syntax'].slice(1)).toContainEqual(
      expect.objectContaining({ selector: 'BinaryExpression[operator="in"]' }),
    );
  });

  it('enforces the React convention rules for React workspaces only', async () => {
    const expectedEntries = {
      'react/jsx-no-leaked-render': [ERROR, { validStrategies: ['ternary'] }],
      'react/jsx-max-depth': [ERROR, { max: MAX_JSX_DEPTH }],
      'max-depth': [ERROR, MAX_DEPTH],
    };

    for (const [ruleName, expectedEntry] of Object.entries(expectedEntries)) {
      expect(await readEnforcedEntry(web, 'src/component.tsx', ruleName), ruleName).toEqual(expectedEntry);
    }
    for (const ruleName of REACT_COMPILER_RULE_NAMES) {
      expect((await readEnforcedEntry(web, 'src/component.tsx', ruleName))[0], ruleName).toBe(ERROR);
      expect((await readEnforcedEntry(backend, 'src/component.tsx', ruleName))[0], ruleName).toBe(OFF);
    }
    for (const ruleName of ['react/jsx-no-leaked-render', 'react/jsx-max-depth']) {
      expect((await readEnforcedEntry(backend, 'src/component.tsx', ruleName))[0], ruleName).toBe(OFF);
    }
  });

  it('turns the default export rule off only for the listed entry files', async () => {
    expect((await readEnforcedEntry(backend, WORKER_ENTRY_FILE, 'import-x/no-default-export'))[0]).toBe(OFF);
    expect((await readEnforcedEntry(backend, 'src/other.ts', 'import-x/no-default-export'))[0]).toBe(ERROR);
  });

  it('forbids index files except a route folder index', async () => {
    async function isIndexForbidden(fileName) {
      const rules = await readEslintRules(backendEslint, fileName);
      return rules['no-restricted-syntax'].some((entry) => entry.selector === 'Program');
    }

    expect(await isIndexForbidden('src/features/index.ts')).toBe(true);
    expect(await isIndexForbidden('src/routes/users/index.ts')).toBe(false);
    expect(await isIndexForbidden('src/features/users.ts')).toBe(false);
  });
});

describe('convention rule limits at their defaults', () => {
  const linter = new Linter();
  const config = [
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { react: reactPlugin },
    },
    ...createConventionRulesConfig({ doesRenderReact: false }).map((entry) => ({
      ...entry,
      rules: Object.fromEntries(
        Object.entries(entry.rules).filter(([ruleName]) => LIMIT_RULE_NAMES.includes(ruleName)),
      ),
    })),
    {
      files: ['**/*.tsx'],
      rules: { 'react/jsx-max-depth': ['error', { max: MAX_JSX_DEPTH }] },
    },
  ];

  function lintRuleIds(code, filename) {
    return linter.verify(code, config, { filename }).map((message) => message.ruleId);
  }

  function repeat(count, lines) {
    return Array.from({ length: count }, () => lines).join('\n');
  }

  function wrapInFunction(body) {
    return `export function run(flag: boolean) {\n${body}\n}\n`;
  }

  function nestDepth(depth) {
    return `${'if (flag) {\n'.repeat(depth)}flag = !flag;\n${'}\n'.repeat(depth)}`;
  }

  function nestJsx(elementCount) {
    const opening = '<div>'.repeat(elementCount - 1);
    const closing = '</div>'.repeat(elementCount - 1);
    return `export const view = ${opening}<span />${closing};\n`;
  }

  it('allows the cognitive complexity limit and reports one point more', () => {
    const branch = 'if (flag) {\nflag = !flag;\n}';

    expect(lintRuleIds(wrapInFunction(repeat(MAX_COGNITIVE_COMPLEXITY, branch)), 'a.ts')).toEqual([]);
    expect(lintRuleIds(wrapInFunction(repeat(MAX_COGNITIVE_COMPLEXITY + 1, branch)), 'a.ts')).toEqual([
      'sonarjs/cognitive-complexity',
    ]);
  });

  it('allows the function length limit and reports one line more', () => {
    const statementCount = MAX_LINES_PER_FUNCTION - FUNCTION_FRAME_LINES;

    expect(lintRuleIds(wrapInFunction(repeat(statementCount, 'flag = !flag;')), 'a.ts')).toEqual([]);
    expect(lintRuleIds(wrapInFunction(repeat(statementCount + 1, 'flag = !flag;')), 'a.ts')).toEqual([
      'max-lines-per-function',
    ]);
  });

  it('allows the block nesting limit and reports one level more', () => {
    expect(lintRuleIds(wrapInFunction(nestDepth(MAX_DEPTH)), 'a.ts')).not.toContain('max-depth');
    expect(lintRuleIds(wrapInFunction(nestDepth(MAX_DEPTH + 1)), 'a.ts')).toContain('max-depth');
  });

  it('allows the JSX nesting limit and reports one level more', () => {
    expect(lintRuleIds(nestJsx(MAX_JSX_DEPTH + 1), 'a.tsx')).toEqual([]);
    expect(lintRuleIds(nestJsx(MAX_JSX_DEPTH + 2), 'a.tsx')).toEqual(['react/jsx-max-depth']);
  });
});
